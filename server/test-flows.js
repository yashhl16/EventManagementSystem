import app from './src/app.js';
import { connectDB, closeDB } from './src/config/db.js';
import { seedDatabase } from './src/config/seed.js';

const TEST_PORT = 5055;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

async function runTests() {
  console.log('=== STARTING AUTOMATED FLOW VERIFICATION ===\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition, desc) => {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  };

  let server;

  try {
    await connectDB();
    await seedDatabase();

    await new Promise((resolve) => {
      server = app.listen(TEST_PORT, () => {
        resolve();
      });
    });

    // 1. Health check
    const health = await fetch(`${BASE_URL}/health`).then((r) => r.json());
    assert(health.status === 'healthy', 'Health check returns healthy');

    // 2. Security Test: Student cannot log in through Admin Portal
    const studentInAdminPortal = await fetch(`${BASE_URL}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@college.edu', password: 'Student@12345' }),
    });
    assert(
      studentInAdminPortal.status === 403,
      'Student credentials rejected at Admin Portal with status 403'
    );

    // 3. Security Test: Organizer cannot log in through Admin Portal
    const organizerInAdminPortal = await fetch(`${BASE_URL}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'organizer@college.edu', password: 'Organizer@12345' }),
    });
    assert(
      organizerInAdminPortal.status === 403,
      'Organizer credentials rejected at Admin Portal with status 403'
    );

    // 4. Admin Portal Login Success
    const adminLoginRes = await fetch(`${BASE_URL}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@college.edu', password: 'Admin@12345' }),
    });
    const adminData = await adminLoginRes.json();
    assert(
      adminLoginRes.status === 200 && adminData.token && adminData.user.role === 'admin',
      'Administrator authenticates successfully and obtains JWT token'
    );
    const adminToken = adminData.token;

    // 5. Security Test: Unauthorized access to Admin API endpoints without token
    const unauthAdminAccess = await fetch(`${BASE_URL}/admin/stats`);
    assert(
      unauthAdminAccess.status === 401,
      'Unauthenticated request to /api/admin/stats denied with status 401'
    );

    // 6. Authorized Admin Stats Retrieval
    const authAdminStats = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statsData = await authAdminStats.json();
    assert(
      authAdminStats.status === 200 && statsData.success && typeof statsData.stats.users.students === 'number',
      'Administrator retrieves full campus statistics from Neon PostgreSQL'
    );

    // 7. Student Login Success
    const studentLoginRes = await fetch(`${BASE_URL}/auth/student/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@college.edu', password: 'Student@12345' }),
    });
    const studentData = await studentLoginRes.json();
    assert(
      studentLoginRes.status === 200 && studentData.token && studentData.user.role === 'student',
      'Student demo account logs in successfully with valid session'
    );
    const studentToken = studentData.token;

    // 8. Organizer Login Success
    const organizerLoginRes = await fetch(`${BASE_URL}/auth/organizer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'organizer@college.edu', password: 'Organizer@12345' }),
    });
    const organizerData = await organizerLoginRes.json();
    assert(
      organizerLoginRes.status === 200 && organizerData.token && organizerData.user.role === 'organizer',
      'Organizer demo account logs in successfully with valid session'
    );

    // 9. Input Validation: Missing fields rejected for new registrations
    const missingFieldsReg = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Incomplete User' }),
    });
    assert(
      missingFieldsReg.status === 400,
      'Registration with missing email and password rejected with status 400'
    );

    // 10. Input Validation: Invalid email rejected
    const invalidEmailReg = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Invalid Email User',
        email: 'not-an-email',
        password: 'ValidPassword@12345',
      }),
    });
    assert(
      invalidEmailReg.status === 400,
      'Registration with malformed email rejected with status 400'
    );

    // 11. Input Validation: Short password rejected for new registrations
    const shortPasswordReg = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Student',
        email: 'test_short@college.edu',
        password: 'short',
        studentId: 'STU-001',
      }),
    });
    assert(
      shortPasswordReg.status === 400,
      'Password shorter than 12 characters rejected with status 400'
    );

    // 12. Full Student Registration Flow: Creating new student record in Neon PostgreSQL
    const newStudentEmail = 'elena.rostova@college.edu';
    const newStudentPassword = 'SecureStudent@2026';
    const registerStudentRes = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Elena Rostova',
        email: newStudentEmail,
        password: newStudentPassword,
        studentId: 'STU-ELENA-2026',
        department: 'Computer Science & Engineering',
        graduationYear: 2027,
        phone: '+1-555-019-9000',
        interests: ['Artificial Intelligence', 'Hackathons'],
      }),
    });
    const registerStudentData = await registerStudentRes.json();
    assert(
      registerStudentRes.status === 201 && registerStudentData.token && registerStudentData.user.email === newStudentEmail,
      `Student registration succeeds with status 201 and JWT: "${registerStudentData.user?.name}"`
    );

    // 13. Verify Database Persistence: Direct query to verify stored record & hashed password
    const { query } = await import('./src/config/db.js');
    const dbCheck = await query('SELECT id, name, email, password_hash, role, student_id FROM users WHERE LOWER(email) = $1', [newStudentEmail]);
    assert(
      dbCheck.rows.length === 1 &&
      dbCheck.rows[0].password_hash.startsWith('$2') &&
      dbCheck.rows[0].password_hash !== newStudentPassword &&
      dbCheck.rows[0].role === 'student',
      'Student record is persisted in PostgreSQL with securely hashed password'
    );

    // 14. Verify Login Against Persisted Database Records
    const newStudentLoginRes = await fetch(`${BASE_URL}/auth/student/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newStudentEmail, password: newStudentPassword }),
    });
    const newStudentLoginData = await newStudentLoginRes.json();
    assert(
      newStudentLoginRes.status === 200 && newStudentLoginData.token && newStudentLoginData.user.name === 'Elena Rostova',
      'Newly registered student logs in successfully by authenticating against database'
    );
    const newStudentToken = newStudentLoginData.token;

    // 15. Verify Session / Profile Retrieval via GET /auth/me
    const getMeRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${newStudentToken}` },
    });
    const getMeData = await getMeRes.json();
    assert(
      getMeRes.status === 200 && getMeData.user && getMeData.user.studentId === 'STU-ELENA-2026',
      'Student retrieves persistent profile session from database via /api/auth/me'
    );

    // 16. Duplicate Registration Rejected
    const duplicateStudentReg = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Elena Rostova Duplicate',
        email: newStudentEmail,
        password: newStudentPassword,
      }),
    });
    assert(
      duplicateStudentReg.status === 400,
      'Duplicate student registration rejected with status 400'
    );

    // --- ZERO DUMMY EVENTS & REAL DATABASE STATS VERIFICATION ---
    const initialEventsRes = await fetch(`${BASE_URL}/events`);
    const initialEventsData = await initialEventsRes.json();
    assert(
      initialEventsRes.status === 200 && initialEventsData.events.length === 0,
      'Initial public events list is empty (0 dummy events loaded on startup)'
    );

    const publicStatsRes = await fetch(`${BASE_URL}/events/stats`);
    const publicStatsData = await publicStatsRes.json();
    assert(
      publicStatsRes.status === 200 && publicStatsData.success && publicStatsData.stats.totalEvents === 0,
      'Public stats endpoint returns dynamic totalEvents: 0 when no events exist'
    );

    // 10. Input Validation: Long title rejected for events
    const longTitleEvent = await fetch(`${BASE_URL}/admin/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'A'.repeat(160),
        description: 'Valid description',
        category: 'Technology',
        eventDate: '2026-11-20',
        startTime: '10:00',
        endTime: '16:00',
        venue: 'Auditorium',
      }),
    });
    assert(
      longTitleEvent.status === 400,
      'Event title exceeding 150 characters rejected with status 400'
    );

    // 11. Admin Event Creation (Approved by default)
    const createEventRes = await fetch(`${BASE_URL}/admin/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Institutional AI Summit 2026',
        description: 'Comprehensive campus summit on artificial intelligence and agentic computing.',
        category: 'Technology',
        eventDate: '2026-11-25',
        startTime: '09:00',
        endTime: '17:00',
        venue: 'Central Science Auditorium',
        maxCapacity: 200,
        isPaid: false,
      }),
    });
    const createEventData = await createEventRes.json();
    assert(
      createEventRes.status === 201 && createEventData.event.status === 'approved',
      `Admin creates and publishes event directly: "${createEventData.event?.title}"`
    );
    const createdEventId = createEventData.event._id || createEventData.event.id;

    // 12. Admin Events Listing
    const adminEventsRes = await fetch(`${BASE_URL}/admin/events`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminEventsData = await adminEventsRes.json();
    assert(
      adminEventsRes.status === 200 && adminEventsData.events.length > 0,
      `Admin retrieves events list (${adminEventsData.events.length} events returned)`
    );

    // Verify Public Events & Stats reflect the newly created event
    const updatedEventsRes = await fetch(`${BASE_URL}/events`);
    const updatedEventsData = await updatedEventsRes.json();
    assert(
      updatedEventsRes.status === 200 && updatedEventsData.events.length === 1,
      'Public events listing displays genuine newly created event from Neon database'
    );

    const updatedStatsRes = await fetch(`${BASE_URL}/events/stats`);
    const updatedStatsData = await updatedStatsRes.json();
    assert(
      updatedStatsRes.status === 200 && updatedStatsData.stats.totalEvents === 1,
      'Public stats totalEvents dynamically incremented to 1 in Neon database'
    );

    // 13. Student Registration for Event
    const registerRes = await fetch(`${BASE_URL}/registrations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ eventId: createdEventId }),
    });
    const registerData = await registerRes.json();
    assert(
      registerRes.status === 201 && !!registerData.registration.ticketCode,
      `Student registers for event with ticket code: ${registerData.registration?.ticketCode}`
    );
    const registrationId = registerData.registration._id || registerData.registration.id;

    // 14. Duplicate Registration Prevented
    const dupRegRes = await fetch(`${BASE_URL}/registrations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ eventId: createdEventId }),
    });
    assert(
      dupRegRes.status === 400,
      'Duplicate registration rejected with status 400'
    );

    // 15. Admin Attendance Roster
    const attendanceRes = await fetch(`${BASE_URL}/admin/events/${createdEventId}/attendance`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const attendanceData = await attendanceRes.json();
    assert(
      attendanceRes.status === 200 && attendanceData.roster.length > 0 && attendanceData.stats.totalRegistered >= 1,
      `Admin inspects attendance roster (${attendanceData.roster.length} registered students)`
    );

    // 16. Admin Marks Attendance Present
    const markPresentRes = await fetch(`${BASE_URL}/admin/events/${createdEventId}/attendance/${registrationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'present' }),
    });
    const markPresentData = await markPresentRes.json();
    assert(
      markPresentRes.status === 200 && markPresentData.attendanceStatus === 'present',
      'Admin marks student as Present with status 200'
    );

    // 17. Verify Attendance Updated in Roster
    const verifyAttRes = await fetch(`${BASE_URL}/admin/events/${createdEventId}/attendance`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const verifyAttData = await verifyAttRes.json();
    assert(
      verifyAttRes.status === 200 && verifyAttData.stats.present >= 1,
      'Attendance summary statistics incremented present count'
    );

    // 18. Admin Exports Attendance CSV
    const csvRes = await fetch(`${BASE_URL}/admin/events/${createdEventId}/attendance/export-csv`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const csvText = await csvRes.text();
    assert(
      csvRes.status === 200 && csvText.includes('Student Name,College Email') && csvText.includes('present'),
      'Admin exports attendance CSV with headers and attendance records'
    );

    // 19. Admin Changes Event Status (Unpublish to pending_approval)
    const changeStatusRes = await fetch(`${BASE_URL}/admin/events/${createdEventId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'pending_approval' }),
    });
    assert(
      changeStatusRes.status === 200,
      'Admin changes event publication status to pending_approval'
    );

    // 20. Audit Logs Record Administrative Actions
    const auditRes = await fetch(`${BASE_URL}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const auditData = await auditRes.json();
    assert(
      auditRes.status === 200 && auditData.logs.length > 0,
      `Audit logs verify ${auditData.logs.length} administrative events recorded`
    );

    console.log('\n--- INPUT VALIDATION & CHARACTER LIMIT VERIFICATION SUITE ---');

    // TEST CASE 1: Valid student registration (international characters, valid email, strong password, valid Indian phone)
    const validStudentRes = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: "José Nuñez-O'Connor",
        email: `jose.valid.${Date.now()}@college.edu`,
        password: 'ValidPassword123!',
        phone: '+91 9876543210',
        studentId: 'STU-VALID-01',
        department: 'Computer Science',
      }),
    });
    assert(validStudentRes.status === 201, 'Test Case 1: Valid registration with Unicode name and +91 phone returns 201 Created');

    // TEST CASE 2: Short name (< 2 chars)
    const shortNameRes = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'A',
        email: `shortname.${Date.now()}@college.edu`,
        password: 'ValidPassword123!',
      }),
    });
    assert(shortNameRes.status === 400, 'Test Case 2: Short name (< 2 chars) rejected with 400 Bad Request');

    // TEST CASE 3: Long name (> 100 chars)
    const longNameRes = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'A'.repeat(101),
        email: `longname.${Date.now()}@college.edu`,
        password: 'ValidPassword123!',
      }),
    });
    assert(longNameRes.status === 400, 'Test Case 3: Long name (> 100 chars) rejected with 400 Bad Request');

    // TEST CASE 4: Name with script tags / HTML
    const xssNameRes = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '<script>alert(1)</script>',
        email: `xssname.${Date.now()}@college.edu`,
        password: 'ValidPassword123!',
      }),
    });
    assert(xssNameRes.status === 400, 'Test Case 4: Name with HTML/script markup rejected with 400 Bad Request');

    // TEST CASE 5: Invalid email format
    const invalidEmailRes = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'invalid.email@',
        password: 'ValidPassword123!',
      }),
    });
    assert(invalidEmailRes.status === 400, 'Test Case 5: Invalid email format rejected with 400 Bad Request');

    // TEST CASE 6: Email > 254 chars
    const longEmailRes = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'a'.repeat(245) + '@college.edu',
        password: 'ValidPassword123!',
      }),
    });
    assert(longEmailRes.status === 400, 'Test Case 6: Email > 254 chars rejected with 400 Bad Request');

    // TEST CASE 6b: Missing or empty password rejected with "Password is required."
    const emptyPwdRes1 = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Empty Pwd User',
        email: `emptypwd1.${Date.now()}@college.edu`,
        password: '',
      }),
    });
    const emptyPwdData1 = await emptyPwdRes1.json();
    assert(
      emptyPwdRes1.status === 400 && emptyPwdData1.message === 'Password is required.',
      'Test Case 6b: Empty string password rejected with "Password is required."'
    );

    const missingPwdRes2 = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Missing Pwd User',
        email: `missingpwd2.${Date.now()}@college.edu`,
      }),
    });
    const missingPwdData2 = await missingPwdRes2.json();
    assert(
      missingPwdRes2.status === 400 && missingPwdData2.message === 'Password is required.',
      'Test Case 6c: Missing password property rejected with "Password is required."'
    );

    // TEST CASE 7: Password < 8 chars
    const shortPwdRes = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: `shortpwd.${Date.now()}@college.edu`,
        password: 'pass1',
      }),
    });
    const shortPwdData = await shortPwdRes.json();
    assert(
      shortPwdRes.status === 400 && shortPwdData.message === 'Password must be between 8 and 128 characters.',
      'Test Case 7: Password < 8 chars rejected with "Password must be between 8 and 128 characters."'
    );

    // TEST CASE 7b: Valid 8-character password succeeds
    const eightCharEmail = `eightchar.${Date.now()}@college.edu`;
    const eightCharPwd = 'P@ssw0rd';
    const eightCharRes = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Eight Char User',
        email: eightCharEmail,
        password: eightCharPwd,
        studentId: 'STU-8CHAR',
      }),
    });
    assert(eightCharRes.status === 201, 'Test Case 7b: Valid 8-character password succeeds with 201 Created');

    // TEST CASE 7c: Valid 12-character password with special characters and spaces succeeds
    const specialPwdEmail = `specialpwd.${Date.now()}@college.edu`;
    const specialPwd = 'My P@ssw0rd 2026!';
    const specialPwdRes = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Special Pwd User',
        email: specialPwdEmail,
        password: specialPwd,
        studentId: 'STU-SPECIAL',
      }),
    });
    assert(specialPwdRes.status === 201, 'Test Case 7c: Valid 12+ char password with spaces and specials succeeds with 201 Created');

    // TEST CASE 7d: User logs in using the registered password
    const loginSpecialRes = await fetch(`${BASE_URL}/auth/student/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: specialPwdEmail,
        password: specialPwd,
      }),
    });
    const loginSpecialData = await loginSpecialRes.json();
    assert(
      loginSpecialRes.status === 200 && !!loginSpecialData.token,
      'Test Case 7d: User authenticates successfully using newly registered password with special chars & spaces'
    );

    // TEST CASE 8: Password > 128 chars
    const longPwdRes = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: `longpwd.${Date.now()}@college.edu`,
        password: 'A'.repeat(129),
      }),
    });
    assert(longPwdRes.status === 400, 'Test Case 8: Password > 128 chars rejected with 400 Bad Request');

    // TEST CASE 9: Invalid phone (letters, <10 digits, >15 digits, invalid Indian mobile prefix)
    const invalidPhonePrefixRes = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: `invphone.${Date.now()}@college.edu`,
        password: 'ValidPassword123!',
        phone: '+91 4123456789', // Invalid prefix 4
      }),
    });
    assert(invalidPhonePrefixRes.status === 400, 'Test Case 9: Invalid Indian phone prefix rejected with 400 Bad Request');

    // TEST CASE 10: Valid phone formats (e.g. +91 9876543210, 9876543210, (555) 123-4567)
    const validPhone1Res = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sarah Connor',
        email: `phone1.${Date.now()}@college.edu`,
        password: 'ValidPassword123!',
        phone: '9876543210',
      }),
    });
    const validPhone2Res = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sarah Connor II',
        email: `phone2.${Date.now()}@college.edu`,
        password: 'ValidPassword123!',
        phone: '(555) 123-4567',
      }),
    });
    assert(validPhone1Res.status === 201 && validPhone2Res.status === 201, 'Test Case 10: Valid standard & international phone formats accepted with 201 Created');

    // TEST CASE 11: Event creation with description > 5000 chars
    const longDescEventRes = await fetch(`${BASE_URL}/admin/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Valid Event Title',
        description: 'E'.repeat(5001),
        category: 'Technical',
        eventDate: '2026-11-20',
        startTime: '10:00 AM',
        endTime: '04:00 PM',
        venue: 'Main Auditorium',
      }),
    });
    assert(longDescEventRes.status === 400, 'Test Case 11: Event creation with description > 5000 chars rejected with 400 Bad Request');

    // TEST CASE 12: Event creation with description between 10 and 5000 chars
    const validDescEventRes = await fetch(`${BASE_URL}/admin/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Valid Long Description Event',
        description: 'Detailed event description that exceeds 10 chars and stays well under 5,000 characters limit for testing.',
        category: 'Technical',
        eventDate: '2026-11-20',
        startTime: '10:00 AM',
        endTime: '04:00 PM',
        venue: 'Main Auditorium',
      }),
    });
    assert(validDescEventRes.status === 201, 'Test Case 12: Event creation with valid description (10-5000 chars) returns 201 Created');

    // TEST CASE 13: Event title > 150 chars
    const longTitleEventRes = await fetch(`${BASE_URL}/admin/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'T'.repeat(151),
        description: 'A valid event description.',
        category: 'Technical',
        eventDate: '2026-11-20',
        startTime: '10:00 AM',
        endTime: '04:00 PM',
        venue: 'Main Auditorium',
      }),
    });
    assert(longTitleEventRes.status === 400, 'Test Case 13: Event title > 150 chars rejected with 400 Bad Request');

    // TEST CASE 14: Announcement message > 2000 chars
    const longMsgRes = await fetch(`${BASE_URL}/announcements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Valid Announcement Title',
        content: 'M'.repeat(2001),
        priority: 'urgent',
      }),
    });
    assert(longMsgRes.status === 400, 'Test Case 14: Announcement message > 2000 chars rejected with 400 Bad Request');

    // TEST CASE 15: Search query > 200 chars -> sanitized without error (status 200)
    const longSearchRes = await fetch(`${BASE_URL}/events?search=${'s'.repeat(250)}`);
    assert(longSearchRes.status === 200, 'Test Case 15: Search query > 200 chars safely truncated/sanitized without error (200 OK)');

    // TEST CASE 16: Existing demo logins (student, organizer, admin)
    const [demoStudent, demoOrg, demoAdmin] = await Promise.all([
      fetch(`${BASE_URL}/auth/student/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'student@college.edu', password: 'Student@12345' }),
      }),
      fetch(`${BASE_URL}/auth/organizer/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'organizer@college.edu', password: 'Organizer@12345' }),
      }),
      fetch(`${BASE_URL}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@college.edu', password: 'Admin@12345' }),
      }),
    ]);
    assert(
      demoStudent.status === 200 && demoOrg.status === 200 && demoAdmin.status === 200,
      'Test Case 16: All three existing demo accounts (student, organizer, admin) authenticate successfully (200 OK)'
    );

    // =========================================================================
    // DATE & TIME RESTRICTION TESTS (1-DAY MINIMUM ADVANCE & TIME ORDERING)
    // =========================================================================
    const now = new Date();
    const istFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const todayIST = istFormatter.format(now);
    const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowIST = istFormatter.format(tomorrowDate);
    const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayIST = istFormatter.format(yesterdayDate);
    const futureDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const futureDateIST = istFormatter.format(futureDate);

    // TEST CASE 17: Yesterday date must be rejected with 400 Bad Request
    const yesterdayEventRes = await fetch(`${BASE_URL}/admin/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Past Event Test',
        description: 'Testing that previous dates are rejected.',
        category: 'Technical',
        eventDate: yesterdayIST,
        startTime: '10:00',
        endTime: '12:00',
        venue: 'Auditorium Hall',
      }),
    });
    const yesterdayEventData = await yesterdayEventRes.json();
    assert(
      yesterdayEventRes.status === 400 && yesterdayEventData.message.includes('Previous dates cannot be selected'),
      `Test Case 17: Yesterday date (${yesterdayIST}) rejected with 400 Bad Request ("${yesterdayEventData.message}")`
    );

    // TEST CASE 18: Today's date must be rejected (minimum 1 day in advance)
    const todayEventRes = await fetch(`${BASE_URL}/admin/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Today Event Test',
        description: 'Testing that today is rejected because 1 day advance notice is required.',
        category: 'Workshop',
        eventDate: todayIST,
        startTime: '14:00',
        endTime: '16:00',
        venue: 'Seminar Room 1',
      }),
    });
    const todayEventData = await todayEventRes.json();
    assert(
      todayEventRes.status === 400 && todayEventData.message.includes('Previous dates cannot be selected'),
      `Test Case 18: Today date (${todayIST}) rejected with 400 Bad Request ("${todayEventData.message}")`
    );

    // TEST CASE 19: End time <= Start time must be rejected
    const invalidTimeEventRes = await fetch(`${BASE_URL}/admin/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Invalid Time Event Test',
        description: 'Testing that end time earlier than start time is rejected.',
        category: 'Seminar',
        eventDate: tomorrowIST,
        startTime: '15:00',
        endTime: '11:00',
        venue: 'Conference Hall',
      }),
    });
    const invalidTimeEventData = await invalidTimeEventRes.json();
    assert(
      invalidTimeEventRes.status === 400 && invalidTimeEventData.message.includes('Event end time must be later than event start time'),
      `Test Case 19: End time (11:00) earlier than start time (15:00) rejected with 400 Bad Request ("${invalidTimeEventData.message}")`
    );

    // TEST CASE 20: Valid tomorrow schedule succeeds (Admin createEvent)
    const tomorrowEventRes = await fetch(`${BASE_URL}/admin/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Tomorrow Valid Symposium',
        description: 'A symposium scheduled for tomorrow, satisfying the 1 day advance rule.',
        category: 'Conference',
        eventDate: tomorrowIST,
        startTime: '09:00',
        endTime: '17:00',
        venue: 'Main Campus Auditorium',
      }),
    });
    const tomorrowEventData = await tomorrowEventRes.json();
    assert(
      tomorrowEventRes.status === 201 && tomorrowEventData.success && tomorrowEventData.event,
      `Test Case 20: Event scheduled for tomorrow (${tomorrowIST}) accepted with 201 Created`
    );

    // TEST CASE 21: Valid future schedule succeeds (Organizer createEvent)
    const organizerFutureEventRes = await fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerData.token}`,
      },
      body: JSON.stringify({
        title: 'Next Week Tech Hackathon',
        description: 'A tech hackathon scheduled for 5 days in advance with valid ordering.',
        category: 'Hackathon',
        eventDate: futureDateIST,
        startTime: '10:00',
        endTime: '18:00',
        venue: 'Innovation Lab 3',
        maxCapacity: 120,
      }),
    });
    const organizerFutureEventData = await organizerFutureEventRes.json();
    assert(
      organizerFutureEventRes.status === 201 && organizerFutureEventData.success && organizerFutureEventData.event,
      `Test Case 21: Organizer event scheduled for future date (${futureDateIST}) accepted with 201 Created`
    );

    console.log(`\n=== VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
    await closeDB();
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
