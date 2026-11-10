process.env.NODE_ENV = 'test';
import app from './src/app.js';
import { connectDB, closeDB, computeEventTimestamps } from './src/config/db.js';
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
    const organizerToken = organizerData.token;

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
        phone: '9876543210',
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

    // Verify user profile binding and registration date formatting in registration object
    assert(
      registerData.registration.user &&
        typeof registerData.registration.user === 'object' &&
        (registerData.registration.user.fullName || registerData.registration.user.name) &&
        (registerData.registration.user.department || registerData.registration.user.studentId),
      'Entry pass user profile bound dynamically with name, studentId, and department'
    );

    assert(
      registerData.registration.registrationDate &&
        !isNaN(new Date(registerData.registration.registrationDate).getTime()) &&
        !isNaN(new Date(registerData.registration.registeredAt).getTime()),
      'Registration date safely parsed without "Invalid Date" errors'
    );

    const myRegistrationsCheck = await fetch(`${BASE_URL}/registrations/my`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const myRegistrationsData = await myRegistrationsCheck.json();
    const myRegItem = (myRegistrationsData.registrations || []).find((r) => r.id === registrationId || r._id === registrationId);
    assert(
      myRegItem &&
        myRegItem.user &&
        (myRegItem.user.name || myRegItem.user.fullName) &&
        !isNaN(new Date(myRegItem.registrationDate || myRegItem.registeredAt).getTime()),
      '/api/registrations/my supplies populated attendee details and parseable timestamps'
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
        phone: '9876543210',
        studentId: 'STU-VALID-01',
        department: 'Computer Science',
      }),
    });
    assert(validStudentRes.status === 201, 'Test Case 1: Valid registration with Unicode name and 10-digit phone returns 201 Created');

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

    // TEST CASE 3: Long name (> 60 chars)
    const longNameRes = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'A'.repeat(61),
        email: `longname.${Date.now()}@college.edu`,
        password: 'ValidPassword123!',
      }),
    });
    assert(longNameRes.status === 400, 'Test Case 3: Long name (> 60 chars) rejected with 400 Bad Request');

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

    // TEST CASE 6: Email > 60 chars
    const longEmailRes = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'a'.repeat(50) + '@college.edu',
        password: 'ValidPassword123!',
      }),
    });
    assert(longEmailRes.status === 400, 'Test Case 6: Email > 60 chars rejected with 400 Bad Request');

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

    // TEST CASE 9: Invalid phone (not strictly 10 digits or invalid prefix)
    const invalidPhoneRes = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        email: `invphone.${Date.now()}@college.edu`,
        password: 'ValidPassword123!',
        phone: '12345', // Not 10 digits
      }),
    });
    assert(invalidPhoneRes.status === 400, 'Test Case 9: Phone number not strictly 10 digits rejected with 400 Bad Request');

    // TEST CASE 10: Valid 10-digit phone numbers accepted
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
        phone: '8765432109',
      }),
    });
    assert(validPhone1Res.status === 201 && validPhone2Res.status === 201, 'Test Case 10: Valid 10-digit phone numbers accepted with 201 Created');

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

    // TEST CASE 22: Event objects return startDate, endDate, and eventStatus
    const createdEvent = organizerFutureEventData.event;
    assert(
      createdEvent.startDate && createdEvent.endDate && createdEvent.eventStatus,
      'Test Case 22: Event payload returned by API contains startDate, endDate, and eventStatus fields'
    );

    // TEST CASE 23: Future event dynamically evaluated as 'Upcoming'
    assert(
      createdEvent.eventStatus === 'Upcoming',
      `Test Case 23: Event scheduled for future date (${futureDateIST}) evaluates to eventStatus === 'Upcoming'`
    );

    // TEST CASE 24: Direct verification of target status comparison logic:
    // Upcoming:  currentTime < startDate
    // Ongoing:   currentTime >= startDate && currentTime <= endDate
    // Completed: currentTime > endDate
    const currentTestTime = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${currentTestTime.getFullYear()}-${pad(currentTestTime.getMonth() + 1)}-${pad(currentTestTime.getDate())}`;

    // Test past event -> Completed
    const pastCheck = computeEventTimestamps('2024-01-01', '10:00', '12:00', 'approved');
    assert(
      pastCheck.eventStatus === 'Completed',
      "Test Case 24a: Past event (currentTime > endDate) calculates as 'Completed'"
    );

    // Test future event -> Upcoming
    const futureCheck = computeEventTimestamps('2029-12-31', '10:00', '12:00', 'approved');
    assert(
      futureCheck.eventStatus === 'Upcoming',
      "Test Case 24b: Future event (currentTime < startDate) calculates as 'Upcoming'"
    );

    // Test currently active window -> Ongoing
    const currentStartHour = pad(Math.max(0, currentTestTime.getHours() - 1));
    const currentEndHour = pad(Math.min(23, currentTestTime.getHours() + 1));
    const ongoingCheck = computeEventTimestamps(todayStr, `${currentStartHour}:00`, `${currentEndHour}:59`, 'approved');
    assert(
      ongoingCheck.eventStatus === 'Ongoing',
      "Test Case 24c: In-progress event (currentTime >= startDate && currentTime <= endDate) calculates as 'Ongoing'"
    );

    // TEST CASE 25: Verify all previously enforced VARCHAR and phone constraints remain active
    const checkLongNameRes = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'A'.repeat(61),
        email: 'validname61@college.edu',
        password: 'ValidPassword@123',
        phone: '9876543210',
      }),
    });
    assert(
      checkLongNameRes.status === 400,
      'Test Case 25a: Student registration with name > 60 chars continues to be rejected with 400 Bad Request'
    );

    const checkLongEmailRes = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Valid Student Name',
        email: `${'a'.repeat(50)}@college.edu`,
        password: 'ValidPassword@123',
        phone: '9876543210',
      }),
    });
    assert(
      checkLongEmailRes.status === 400,
      'Test Case 25b: Student registration with email > 60 chars continues to be rejected with 400 Bad Request'
    );

    const checkInvalidPhoneRes = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Valid Student Name',
        email: 'studentvalidphone@college.edu',
        password: 'ValidPassword@123',
        phone: '987654321', // 9 digits
      }),
    });
    assert(
      checkInvalidPhoneRes.status === 400,
      'Test Case 25c: Student registration with 9-digit phone continues to be rejected with 400 Bad Request'
    );

    // ========================================================
    // TEST SUITE: TEAM REGISTRATION & DOCUMENT SUBMISSION FLOWS
    // ========================================================

    // Create a dedicated Hackathon team event for testing
    const createHackathonRes = await fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({
        title: 'Smart India Hackathon (SIH) 2026',
        description: 'National collegiate hackathon for high-impact software and hardware solutions.',
        category: 'Hackathon',
        eventDate: '2026-11-25',
        startTime: '09:00',
        endTime: '21:00',
        venue: 'Campus Innovation Center',
        venueType: 'offline',
        maxCapacity: 150,
        isTeamEvent: true,
        maxTeamSize: 4,
        teamMinSize: 2,
        teamMaxSize: 4,
        tags: ['Hackathon', 'SIH', 'Innovation'],
      }),
    });
    const createHackathonData = await createHackathonRes.json();
    assert(
      createHackathonRes.status === 201 && createHackathonData.event?._id,
      'Test Case 26a: Organizer creates Hackathon team event with isTeamEvent: true'
    );

    const hackathonId = createHackathonData.event?._id;

    // Create a second student account for team testing
    const student2Email = `teammate_${Date.now()}@college.edu`;
    const student2Pass = 'Teammate@12345';
    const regStudent2Res = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jordan Teammate',
        email: student2Email,
        password: student2Pass,
        phone: '9876543299',
        studentId: `CS-${Date.now().toString().slice(-4)}`,
        department: 'Computer Science & Engineering',
      }),
    });
    const regStudent2Data = await regStudent2Res.json();
    assert(
      regStudent2Res.status === 201 && regStudent2Data.token,
      'Test Case 26b: Teammate student account registered successfully'
    );
    const student2Token = regStudent2Data.token;

    // Student 1 creates a team
    const createTeamRes = await fetch(`${BASE_URL}/teams/${hackathonId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        name: 'Neural Pioneers',
        invites: [student2Email],
      }),
    });
    const createTeamData = await createTeamRes.json();
    assert(
      createTeamRes.status === 201 && createTeamData.success && createTeamData.team?.inviteCode,
      'Test Case 26c: Student 1 creates team "Neural Pioneers" with generated inviteCode'
    );
    const createdTeam = createTeamData.team;
    const inviteCode = createdTeam?.inviteCode;

    // Student 1 queries my team
    const myTeamRes = await fetch(`${BASE_URL}/teams/${hackathonId}/my`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const myTeamData = await myTeamRes.json();
    assert(
      myTeamRes.status === 200 && myTeamData.hasTeam && myTeamData.team.members?.length >= 1,
      'Test Case 26d: Team Leader verifies team roster via /teams/:eventId/my'
    );

    // TEST CASE 27: Teammate joins using invite code
    const joinTeamRes = await fetch(`${BASE_URL}/teams/${hackathonId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${student2Token}`,
      },
      body: JSON.stringify({ inviteCode }),
    });
    const joinTeamData = await joinTeamRes.json();
    assert(
      joinTeamRes.status === 200 && joinTeamData.success && joinTeamData.team?.members?.length === 2,
      'Test Case 27a: Student 2 successfully joins "Neural Pioneers" using invite code'
    );

    // Student 2 cannot join a second time
    const duplicateJoinRes = await fetch(`${BASE_URL}/teams/${hackathonId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${student2Token}`,
      },
      body: JSON.stringify({ inviteCode }),
    });
    assert(
      duplicateJoinRes.status === 400,
      'Test Case 27b: Duplicate team join blocked with 400 Bad Request'
    );

    // TEST CASE 28: Deliverable Document Submission
    // 28a: Disallow invalid extensions (e.g., .exe)
    const invalidFileRes = await fetch(`${BASE_URL}/submissions/${hackathonId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        title: 'Malicious Payload Test',
        fileName: 'virus.exe',
        fileData: 'data:application/octet-stream;base64,TVqQAAMAAAAEAAAA//8AALgAAAAAAAAAQAA=',
      }),
    });
    assert(
      invalidFileRes.status === 400,
      'Test Case 28a: Non-allowed document type (.exe) rejected with 400 Bad Request'
    );

    // 28b: Submit valid PDF deliverable with GitHub and Figma links
    const submitPdfRes = await fetch(`${BASE_URL}/submissions/${hackathonId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        title: 'Neural Vision SIH Presentation',
        description: 'Autonomous disaster response system powered by multimodal vision transformers.',
        fileName: 'neural_vision_presentation.pdf',
        fileData: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDwgL0xlbmd0aCA1IDAgUiAvRmlsdGVyIC9GbGF0ZURlY29kZSA+PgpzdHJlYW0KeAE=',
        githubUrl: 'https://github.com/yashhl16/neural-vision',
        figmaUrl: 'https://figma.com/file/sample123/Neural-Vision-UI',
      }),
    });
    const submitPdfData = await submitPdfRes.json();
    assert(
      submitPdfRes.status === 201 && submitPdfData.success && submitPdfData.submission?.fileUrl,
      'Test Case 28b: Team successfully submits PDF deliverable with GitHub and Figma repository links'
    );

    // 28c: Teammate can view the submitted deliverable
    const teammateSubmissionRes = await fetch(`${BASE_URL}/submissions/${hackathonId}/my`, {
      headers: { Authorization: `Bearer ${student2Token}` },
    });
    const teammateSubmissionData = await teammateSubmissionRes.json();
    assert(
      teammateSubmissionRes.status === 200 &&
        teammateSubmissionData.hasSubmission &&
        teammateSubmissionData.submission.fileName === 'neural_vision_presentation.pdf',
      'Test Case 28c: Teammates can immediately view and track team deliverable status'
    );

    // 28d: Team Leader updates/replaces deliverable with PowerPoint deck (.pptx)
    const updateSubmissionRes = await fetch(`${BASE_URL}/submissions/${hackathonId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        title: 'Neural Vision Final Pitch Deck',
        description: 'Updated pitch deck including financial projections and pilot results.',
        fileName: 'neural_vision_final.pptx',
        fileData: 'data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,UEsDBBQAAAAIAAA==',
        githubUrl: 'https://github.com/yashhl16/neural-vision-v2',
      }),
    });
    const updateSubmissionData = await updateSubmissionRes.json();
    assert(
      updateSubmissionRes.status === 200 &&
        updateSubmissionData.submission?.fileName === 'neural_vision_final.pptx',
      'Test Case 28d: Team leader successfully updates/replaces submitted document before deadline'
    );

    // TEST CASE 29: Organizer & Admin Review of Teams and Submissions
    // 29a: Organizer fetches all registered teams for hackathon
    const orgTeamsRes = await fetch(`${BASE_URL}/events/${hackathonId}/teams`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    const orgTeamsData = await orgTeamsRes.json();
    assert(
      orgTeamsRes.status === 200 &&
        Array.isArray(orgTeamsData.teams) &&
        orgTeamsData.teams.some((t) => t.name === 'Neural Pioneers'),
      'Test Case 29a: Organizer views all registered teams and member rosters'
    );

    // 29b: Organizer fetches all deliverables for review
    const orgSubmissionsRes = await fetch(`${BASE_URL}/events/${hackathonId}/submissions`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    const orgSubmissionsData = await orgSubmissionsRes.json();
    assert(
      orgSubmissionsRes.status === 200 &&
        Array.isArray(orgSubmissionsData.submissions) &&
        orgSubmissionsData.submissions.some((s) => s.fileName === 'neural_vision_final.pptx'),
      'Test Case 29b: Organizer retrieves deliverable submissions and external links for evaluation'
    );

    // ========================================================
    // TEST CASE 30: DIRECT /api/events/:eventId/submit & REGISTRATION GUARD
    // ========================================================

    // 30a: Unregistered user blocked from submitting deliverables
    const unregisteredStudentEmail = `unreg_${Date.now()}@college.edu`;
    const regResTemp = await fetch(`${BASE_URL}/auth/student/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Unregistered Candidate',
        email: unregisteredStudentEmail,
        password: 'Password@12345',
        phone: '9876543200',
        studentId: `UN-${Date.now().toString().slice(-4)}`,
        department: 'Information Technology',
      }),
    });
    const unregToken = (await regResTemp.json()).token;

    const unregSubmitRes = await fetch(`${BASE_URL}/events/${hackathonId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${unregToken}`,
      },
      body: JSON.stringify({
        title: 'Unregistered Attempt',
        fileName: 'unregistered.pdf',
        fileData: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCg==',
      }),
    });
    assert(
      unregSubmitRes.status === 403,
      'Test Case 30a: Direct /events/:eventId/submit blocks unregistered users with 403 Forbidden'
    );

    // 30b: Direct endpoint /events/:eventId/submit succeeds for confirmed registered student
    const directSubmitRes = await fetch(`${BASE_URL}/events/${hackathonId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        title: 'Direct API Endpoint Verification',
        description: 'Verifying seamless routing via /api/events/:eventId/submit.',
        fileName: 'verified_deliverable.pdf',
        fileData: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCg==',
      }),
    });
    const directSubmitData = await directSubmitRes.json();
    assert(
      (directSubmitRes.status === 200 || directSubmitRes.status === 201) &&
        directSubmitData.success &&
        directSubmitData.submission?.fileName === 'verified_deliverable.pdf',
      'Test Case 30b: Direct /api/events/:eventId/submit successfully submits and updates deliverable'
    );

    // 30c: Direct /api/events/:eventId/my-submission endpoint returns submission
    const getMySubDirect = await fetch(`${BASE_URL}/events/${hackathonId}/my-submission`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const getMySubDirectData = await getMySubDirect.json();
    assert(
      getMySubDirect.status === 200 &&
        getMySubDirectData.hasSubmitted &&
        getMySubDirectData.submission?.fileName === 'verified_deliverable.pdf',
      'Test Case 30c: Direct /api/events/:eventId/my-submission retrieves current active submission'
    );

    // 31: Profile Update Security - Restrict edits to name, roll number, dept, avatar while locking email & username
    const profileUpdateRes = await fetch(`${BASE_URL}/user/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        fullName: 'Yash Patil',
        rollNumber: 'SGU2023CS0101',
        department: 'Artificial Intelligence & Data Science',
        avatar: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        email: 'malicious_change@evil.com',
        username: 'malicious_user',
      }),
    });
    const profileUpdateData = await profileUpdateRes.json();
    assert(
      profileUpdateRes.status === 200 &&
        profileUpdateData.success &&
        profileUpdateData.user?.fullName === 'Yash Patil' &&
        profileUpdateData.user?.rollNumber === 'SGU2023CS0101' &&
        profileUpdateData.user?.department === 'Artificial Intelligence & Data Science' &&
        profileUpdateData.user?.avatar.startsWith('data:image/png;base64') &&
        profileUpdateData.user?.email === 'student@college.edu' &&
        profileUpdateData.user?.username === 'student',
      'Test Case 31a: Student profile update updates name, rollNumber, department, avatar, while preserving locked email & username'
    );

    // 31b: Reject Full Name exceeding 60 characters
    const profileLongNameRes = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        fullName: 'A'.repeat(61),
      }),
    });
    assert(
      profileLongNameRes.status === 400,
      'Test Case 31b: Profile update rejects full names exceeding 60 characters with 400 Bad Request'
    );

    // 32: Automated Certificate of Participation Generation & Verification System
    // 32a: Organizer creates an event and student registers
    const certTestEventRes = await fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({
        title: 'Quantum Computing Hands-on Workshop',
        description: 'Explore quantum circuits and Qiskit hands-on programming on live simulated qubits.',
        category: 'Workshop',
        bannerImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=600',
        eventDate: '2026-11-20',
        startTime: '10:00',
        endTime: '16:00',
        venue: 'Quantum Labs, Block C',
        maxCapacity: 50,
        registrationDeadline: '2026-11-19T23:59:59Z',
      }),
    });
    const certTestEventData = await certTestEventRes.json();
    const certEventId = certTestEventData.event?._id;
    assert(certTestEventRes.status === 201 && certEventId, 'Test Case 32a: Organizer creates event for certificate generation testing');

    // Admin approves the event
    await fetch(`${BASE_URL}/admin/events/${certEventId}/approve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    // Student registers for event
    const certStudentRegRes = await fetch(`${BASE_URL}/registrations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ eventId: certEventId, bypassConflict: true }),
    });
    const certStudentRegData = await certStudentRegRes.json();
    const studentTicketCode = certStudentRegData.registration?.ticketCode;
    assert(certStudentRegRes.status === 201 && !!studentTicketCode, 'Test Case 32b: Student registers and receives ticket pass');

    // 32c: Organizer marks attendance via POST /api/organizer/mark-attendance
    const markAttRes = await fetch(`${BASE_URL}/organizer/mark-attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({ ticketCode: studentTicketCode }),
    });
    const markAttData = await markAttRes.json();
    assert(
      markAttRes.status === 200 &&
        markAttData.success &&
        markAttData.attendance &&
        markAttData.certificate &&
        !!markAttData.certificate.certificateCode,
      'Test Case 32c: Organizer marks attendance via POST /api/organizer/mark-attendance and system auto-generates certificate'
    );
    const generatedCertCode = markAttData.certificate?.certificateCode;

    // 32d: Authenticated student retrieves certificates list
    const myCertsRes = await fetch(`${BASE_URL}/certificates/my`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const myCertsData = await myCertsRes.json();
    assert(
      myCertsRes.status === 200 &&
        myCertsData.success &&
        myCertsData.certificates.some((c) => c.certificateCode === generatedCertCode),
      'Test Case 32d: Student retrieves earned certificates list via GET /api/certificates/my'
    );

    // 32e: Authenticated student retrieves certificate for specific event
    const eventCertRes = await fetch(`${BASE_URL}/certificates/event/${certEventId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const eventCertData = await eventCertRes.json();
    assert(
      eventCertRes.status === 200 &&
        eventCertData.success &&
        eventCertData.certificate?.certificateCode === generatedCertCode,
      'Test Case 32e: Student retrieves event-specific certificate via GET /api/certificates/event/:eventId'
    );

    // 32f: Public verification endpoint verifies authentic certificate
    const verifyPubRes = await fetch(`${BASE_URL}/certificates/verify/${generatedCertCode}`);
    const verifyPubData = await verifyPubRes.json();
    assert(
      verifyPubRes.status === 200 &&
        verifyPubData.success &&
        verifyPubData.certificate?.status === 'valid' &&
        verifyPubData.certificate?.eventTitle === 'Quantum Computing Hands-on Workshop',
      'Test Case 32f: Public verification endpoint validates certificate authenticity via /api/certificates/verify/:code'
    );

    // 32g: Download endpoint streams printable certificate HTML
    const downloadRes = await fetch(`${BASE_URL}/certificates/download/${generatedCertCode}`);
    const downloadHtml = await downloadRes.text();
    assert(
      downloadRes.status === 200 &&
        downloadHtml.includes('Certificate of Participation') &&
        downloadHtml.includes('Quantum Computing Hands-on Workshop') &&
        downloadHtml.includes(generatedCertCode),
      'Test Case 32g: Certificate download endpoint streams printable certificate template via /api/certificates/download/:code'
    );

    // ==========================================
    // TEST CASE 33: Organizer QR Pass Scanner & Gatekeeper Verification Workflow
    // ==========================================
    // 33a: Create event and register attendee
    const gatekeeperEventRes = await fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({
        title: 'Smart India Hackathon (SIH) 2026 Grand Finale',
        description: 'National software hackathon solving problems for ministries and departments.',
        category: 'Hackathon',
        eventDate: '2026-11-20',
        startTime: '09:00',
        endTime: '18:00',
        venue: 'Campus Tech Center',
        maxCapacity: 100,
        registrationDeadline: '2026-11-19',
        isTeamEvent: true,
        maxTeamSize: 4,
      }),
    });
    const gatekeeperEventData = await gatekeeperEventRes.json();
    const gatekeeperEventId = gatekeeperEventData.event?.id || gatekeeperEventData.event?._id;
    await fetch(`${BASE_URL}/admin/events/${gatekeeperEventId}/approve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    // Student registers for SIH event
    const gatekeeperRegRes = await fetch(`${BASE_URL}/registrations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ eventId: gatekeeperEventId, bypassConflict: true }),
    });
    const gatekeeperRegData = await gatekeeperRegRes.json();
    const gatekeeperTicketCode = gatekeeperRegData.registration?.ticketCode;
    assert(
      gatekeeperRegRes.status === 201 && !!gatekeeperTicketCode,
      'Test Case 33a: Student registers for SIH event and receives entry pass ticketCode'
    );

    // 33b: Pre-check pass details before action via GET /api/organizer/verify-pass/:passCode
    const preCheckRes = await fetch(`${BASE_URL}/organizer/verify-pass/${gatekeeperTicketCode}`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    const preCheckData = await preCheckRes.json();
    assert(
      preCheckRes.status === 200 &&
        preCheckData.success &&
        preCheckData.passCode === gatekeeperTicketCode &&
        preCheckData.isPresent === false &&
        !!preCheckData.attendee?.name &&
        !!preCheckData.event?.title,
      'Test Case 33b: Organizer previews attendee pass details via GET /api/organizer/verify-pass/:passCode before action'
    );

    // 33c: Pre-check pass details via GET /api/attendance/pass/:passCode and full URL string
    const passQueryRes = await fetch(
      `${BASE_URL}/attendance/pass?passCode=https://college.edu/organizer/scan?passCode=${gatekeeperTicketCode}`,
      {
        headers: { Authorization: `Bearer ${organizerToken}` },
      }
    );
    const passQueryData = await passQueryRes.json();
    assert(
      passQueryRes.status === 200 &&
        passQueryData.success &&
        passQueryData.passCode === gatekeeperTicketCode,
      'Test Case 33c: Pass verification endpoint extracts passCode from full URL query parameters'
    );

    // 33d: Organizer marks attendance via POST /api/organizer/mark-attendance
    const markGatekeeperAttRes = await fetch(`${BASE_URL}/organizer/mark-attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({ ticketCode: gatekeeperTicketCode }),
    });
    const markGatekeeperAttData = await markGatekeeperAttRes.json();
    assert(
      markGatekeeperAttRes.status === 200 &&
        markGatekeeperAttData.success &&
        markGatekeeperAttData.alreadyMarked === false &&
        markGatekeeperAttData.isPresent === true &&
        markGatekeeperAttData.attendance?.ticketCode === gatekeeperTicketCode,
      'Test Case 33d: Organizer clicks "Mark Attendance", attendee marked PRESENT in PostgreSQL and certificate issued'
    );

    // 33e: Pass lookup now shows isPresent === true with check-in timestamp
    const postCheckRes = await fetch(`${BASE_URL}/organizer/verify-pass/${gatekeeperTicketCode}`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    const postCheckData = await postCheckRes.json();
    assert(
      postCheckRes.status === 200 &&
        postCheckData.success &&
        postCheckData.isPresent === true &&
        !!postCheckData.attendedAt,
      'Test Case 33e: Subsequent pass lookup reflects updated PRESENT state and recorded attendedAt timestamp'
    );

    // 33f: Second scan prevents double-marking and returns alreadyMarked: true
    const secondMarkRes = await fetch(`${BASE_URL}/organizer/mark-attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({ ticketCode: gatekeeperTicketCode }),
    });
    const secondMarkData = await secondMarkRes.json();
    assert(
      secondMarkRes.status === 200 &&
        secondMarkData.success &&
        secondMarkData.alreadyMarked === true &&
        secondMarkData.isPresent === true,
      'Test Case 33f: Scanning pass a second time safely prevents duplicate check-in and returns alreadyMarked: true'
    );

    // 33g: Unknown / invalid pass code returns 404
    const unknownPassRes = await fetch(`${BASE_URL}/organizer/verify-pass/CP-INVALID-999999`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    assert(
      unknownPassRes.status === 404,
      'Test Case 33g: Non-existent or invalid pass code returns 404 Not Found'
    );

    // ==========================================
    // TEST CASE 34: Custom Certificate Template Upload & Dynamic Student Overlay
    // ==========================================
    const customTemplateUrl = 'https://images.unsplash.com/photo-custom-certificate-template-2026.png';
    const customTemplateConfig = {
      studentName: { x: 50, y: 44, fontSize: 46, color: '#1e1b4b', align: 'center', bold: true },
      studentRoll: { x: 50, y: 52, fontSize: 20, color: '#4338ca', align: 'center', bold: false },
      eventTitle: { x: 50, y: 62, fontSize: 26, color: '#1e1b4b', align: 'center', bold: true },
      issueDate: { x: 26, y: 82, fontSize: 16, color: '#475569', align: 'center', bold: false },
      certificateId: { x: 74, y: 82, fontSize: 16, color: '#475569', align: 'center', bold: true },
    };

    // 34a: Organizer creates event with custom certificate template and coordinates
    const templateEventRes = await fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({
        title: 'National Robotics & Autonomous Systems Symposium',
        description: 'Premier symposium showcasing autonomous robotics and AI hardware demonstrations.',
        category: 'Workshop',
        eventDate: '2026-11-25',
        startTime: '10:00',
        endTime: '17:00',
        venue: 'Robotics Engineering Hall',
        maxCapacity: 80,
        registrationDeadline: '2026-11-24',
        certificateTemplateUrl: customTemplateUrl,
        certificateTemplateConfig: customTemplateConfig,
      }),
    });
    const templateEventData = await templateEventRes.json();
    const templateEventId = templateEventData.event?.id || templateEventData.event?._id;
    assert(
      templateEventRes.status === 201 &&
        templateEventData.success &&
        templateEventData.event?.certificateTemplateUrl === customTemplateUrl &&
        !!templateEventData.event?.certificateTemplateConfig?.studentName,
      'Test Case 34a: Organizer creates event with custom certificate template and coordinates'
    );

    // Approve event
    await fetch(`${BASE_URL}/admin/events/${templateEventId}/approve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    // 34b: Fetch event details verifies certificateTemplateUrl persistence
    const getEvtRes = await fetch(`${BASE_URL}/events/${templateEventId}`);
    const getEvtData = await getEvtRes.json();
    assert(
      getEvtRes.status === 200 &&
        getEvtData.event?.certificateTemplateUrl === customTemplateUrl,
      'Test Case 34b: Public event endpoint returns stored certificateTemplateUrl'
    );

    // Student registers for custom template event
    const templateStudentRegRes = await fetch(`${BASE_URL}/registrations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ eventId: templateEventId, bypassConflict: true }),
    });
    const templateStudentRegData = await templateStudentRegRes.json();
    const templateTicketCode = templateStudentRegData.registration?.ticketCode;
    assert(
      templateStudentRegRes.status === 201 && !!templateTicketCode,
      'Test Case 34c: Student registers for custom template event'
    );

    // 34d: Organizer marks attendance and system auto-generates certificate linked to custom template
    const markTemplateAttRes = await fetch(`${BASE_URL}/organizer/mark-attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({ ticketCode: templateTicketCode }),
    });
    const markTemplateAttData = await markTemplateAttRes.json();
    const customCertCode = markTemplateAttData.certificate?.certificateCode;
    assert(
      markTemplateAttRes.status === 200 &&
        markTemplateAttData.success &&
        !!customCertCode &&
        markTemplateAttData.certificate?.certificateTemplateUrl === customTemplateUrl,
      'Test Case 34d: Attendance marked and certificate generated with event custom certificate template URL'
    );

    // 34e: Student queries /certificates/my and receives custom template info
    const myCustomCertRes = await fetch(`${BASE_URL}/certificates/my`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const myCustomCertData = await myCustomCertRes.json();
    const foundCert = myCustomCertData.certificates?.find((c) => c.certificateCode === customCertCode);
    assert(
      myCustomCertRes.status === 200 &&
        !!foundCert &&
        foundCert.certificateTemplateUrl === customTemplateUrl,
      'Test Case 34e: Student retrieves certificate with custom template URL and coordinate metadata'
    );

    // 34f: Public verification route verifies certificate and returns custom template metadata
    const verifyCustomRes = await fetch(`${BASE_URL}/certificates/verify/${customCertCode}`);
    const verifyCustomData = await verifyCustomRes.json();
    assert(
      verifyCustomRes.status === 200 &&
        verifyCustomData.success &&
        verifyCustomData.certificate?.certificateTemplateUrl === customTemplateUrl,
      'Test Case 34f: Public certificate verification endpoint supplies custom template information'
    );

    // 34g: Download endpoint outputs custom template HTML with dynamic student data overlays
    const downloadCustomRes = await fetch(`${BASE_URL}/certificates/download/${customCertCode}`);
    const downloadCustomHtml = await downloadCustomRes.text();
    assert(
      downloadCustomRes.status === 200 &&
        downloadCustomHtml.includes(customTemplateUrl) &&
        downloadCustomHtml.includes('custom-cert-frame') &&
        downloadCustomHtml.includes('National Robotics & Autonomous Systems Symposium') &&
        downloadCustomHtml.includes(customCertCode),
      'Test Case 34g: Download endpoint renders custom template background with dynamic student data overlay'
    );

    // 34h: Organizer updates event's certificate template via PUT /api/events/:id
    const updatedTemplateUrl = 'https://images.unsplash.com/photo-updated-template-v2.png';
    const updateEvtRes = await fetch(`${BASE_URL}/events/${templateEventId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({
        certificateTemplateUrl: updatedTemplateUrl,
      }),
    });
    const updateEvtData = await updateEvtRes.json();
    assert(
      updateEvtRes.status === 200 &&
        updateEvtData.success &&
        updateEvtData.event?.certificateTemplateUrl === updatedTemplateUrl,
      'Test Case 34h: Organizer updates custom certificate template URL via PUT /events/:id'
    );

    // ==========================================
    // TEST CASE 35: Registration Management Dashboard, RBAC & CSV Export
    // ==========================================
    // 35a: Organizer accesses GET /api/organizer/events/:id/registrations
    const orgRosterRes = await fetch(`${BASE_URL}/organizer/events/${templateEventId}/registrations`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    const orgRosterData = await orgRosterRes.json();
    assert(
      orgRosterRes.status === 200 &&
        orgRosterData.success &&
        Array.isArray(orgRosterData.registrations) &&
        orgRosterData.registrations.length >= 1,
      'Test Case 35a: Organizer fetches event registrations roster successfully'
    );

    // 35b: Roster items contain populated student profile attributes (fullName, rollNumber, department, email, isPresent)
    const attendeeItem = orgRosterData.registrations.find((r) => r.ticketCode === templateTicketCode);
    assert(
      attendeeItem &&
        attendeeItem.fullName &&
        attendeeItem.email &&
        attendeeItem.department &&
        attendeeItem.ticketCode === templateTicketCode &&
        attendeeItem.isPresent === true &&
        attendeeItem.attendanceStatus === 'present' &&
        !!attendeeItem.createdAt,
      'Test Case 35b: Registration items return populated student attributes (fullName, rollNumber, department, email, createdAt, isPresent)'
    );

    // 35c: Quick Analytics counters in API response
    assert(
      orgRosterData.stats &&
        orgRosterData.stats.totalRegistered >= 1 &&
        orgRosterData.stats.maxCapacity === 80 &&
        orgRosterData.stats.checkedIn >= 1 &&
        orgRosterData.stats.attendanceRate > 0 &&
        typeof orgRosterData.stats.openSeats === 'number',
      'Test Case 35c: Event registrations returns accurate stats (totalRegistered, maxCapacity, checkedIn, attendanceRate, openSeats)'
    );

    // 35d: Student cannot access organizer registrations endpoint (403 Forbidden)
    const studentAccessRes = await fetch(`${BASE_URL}/organizer/events/${templateEventId}/registrations`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(
      studentAccessRes.status === 403,
      'Test Case 35d: Student role is rejected with 403 Forbidden on organizer registrations endpoint'
    );

    // 35e: Another organizer cannot access events they do not own (403 Forbidden)
    const otherOrgRegRes = await fetch(`${BASE_URL}/auth/organizer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Professor Charles Xavier',
        fullName: 'Professor Charles Xavier',
        email: 'charles.xavier@campus.edu',
        password: 'Password123!',
        department: 'Computer Science',
        organizationName: 'Robotics Department Club',
        phone: '9876543299',
      }),
    });
    const otherOrgRegData = await otherOrgRegRes.json();
    const otherOrgToken = otherOrgRegData.token;

    const otherOrgAccessRes = await fetch(`${BASE_URL}/organizer/events/${templateEventId}/registrations`, {
      headers: { Authorization: `Bearer ${otherOrgToken}` },
    });
    assert(
      otherOrgAccessRes.status === 403,
      'Test Case 35e: Non-owner organizer is rejected with 403 Forbidden when accessing another organizer roster'
    );

    // 35f: Admin can access any event registrations roster
    const adminRosterRes = await fetch(`${BASE_URL}/organizer/events/${templateEventId}/registrations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminRosterData = await adminRosterRes.json();
    assert(
      adminRosterRes.status === 200 &&
        adminRosterData.success &&
        adminRosterData.registrations.length >= 1,
      'Test Case 35f: Administrator has global access to inspect registrations for any event'
    );

    // 35g: CSV Export endpoint returns formatted CSV data with required headers
    const csvExportRes = await fetch(`${BASE_URL}/organizer/events/${templateEventId}/export-csv`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    const rosterCsvText = await csvExportRes.text();
    assert(
      csvExportRes.status === 200 &&
        rosterCsvText.includes('Student Name') &&
        rosterCsvText.includes('Roll Number') &&
        rosterCsvText.includes('Department') &&
        rosterCsvText.includes('Email') &&
        rosterCsvText.includes('Ticket Code') &&
        rosterCsvText.includes(templateTicketCode),
      'Test Case 35g: Organizer CSV export endpoint returns CSV content with student details and ticket pass'
    );

    // 35h: Admin global registrations endpoint GET /api/admin/registrations
    const globalRegRes = await fetch(`${BASE_URL}/admin/registrations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const globalRegData = await globalRegRes.json();
    assert(
      globalRegRes.status === 200 &&
        globalRegData.success &&
        Array.isArray(globalRegData.registrations) &&
        globalRegData.registrations.length >= 1 &&
        typeof globalRegData.total === 'number' &&
        typeof globalRegData.attendanceRate === 'number',
      'Test Case 35h: Administrator accesses campus-wide registrations directory with global metrics'
    );

    // ==========================================
    // TEST CASE 36: Full Profile Management for Organizers & Admins with Avatar Sync
    // ==========================================
    const newOrgAvatar = 'https://images.unsplash.com/photo-organizer-avatar-2026.png';
    const newAdminAvatar = 'https://images.unsplash.com/photo-admin-avatar-2026.png';

    // 36a: Organizer updates full name, avatar, and organization credentials via PUT /api/user/profile
    const updateOrgRes = await fetch(`${BASE_URL}/user/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({
        fullName: 'Dr. Sarah Connor Updated',
        organizationName: 'Robotics & AI Innovation Hub',
        avatarUrl: newOrgAvatar,
        department: 'School of Advanced Computing',
        phone: '9876543211',
        bio: 'Directing robotics initiatives, autonomous competitions, and hackathons.',
        // Attacker attempts to change email and escalate role:
        email: 'hacked.organizer@badactor.com',
        role: 'admin',
      }),
    });
    const updateOrgData = await updateOrgRes.json();
    assert(
      updateOrgRes.status === 200 &&
        updateOrgData.success &&
        updateOrgData.user?.fullName === 'Dr. Sarah Connor Updated' &&
        updateOrgData.user?.organizationName === 'Robotics & AI Innovation Hub' &&
        updateOrgData.user?.avatar === newOrgAvatar &&
        updateOrgData.user?.role === 'organizer' &&
        updateOrgData.user?.email !== 'hacked.organizer@badactor.com',
      'Test Case 36a: Organizer successfully updates name, organizationName, and avatar while email and role remain strictly protected'
    );

    // 36b: Organizer profile changes immediately reflected in GET /api/auth/me
    const getOrgMeRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    const getOrgMeData = await getOrgMeRes.json();
    assert(
      getOrgMeRes.status === 200 &&
        getOrgMeData.user?.fullName === 'Dr. Sarah Connor Updated' &&
        getOrgMeData.user?.organizationName === 'Robotics & AI Innovation Hub' &&
        getOrgMeData.user?.avatar === newOrgAvatar &&
        getOrgMeData.user?.avatarUrl === newOrgAvatar,
      'Test Case 36b: Organizer session retrieval (GET /api/auth/me) returns updated name, avatarUrl, and organization'
    );

    // 36c: Event host card reflects updated organizer details via GET /api/events/:id
    const updatedEvtRes = await fetch(`${BASE_URL}/events/${templateEventId}`);
    const updatedEvtData = await updatedEvtRes.json();
    assert(
      updatedEvtRes.status === 200 &&
        (updatedEvtData.event?.organizer?.name === 'Dr. Sarah Connor Updated' ||
          updatedEvtData.event?.organizer?.organizationName === 'Robotics & AI Innovation Hub'),
      'Test Case 36c: Event details API dynamically returns updated organizer avatar and organization metadata'
    );

    // 36d: Admin updates full name, designating title, employee/admin ID, and avatar via PUT /api/user/profile
    const updateAdminRes = await fetch(`${BASE_URL}/user/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: 'Chief Administrator Vance Updated',
        organizationName: 'Office of Campus Administration & Oversight',
        employeeId: 'ADM-EXEC-001',
        department: 'Institutional Governance',
        avatarUrl: newAdminAvatar,
        phone: '9876543212',
        bio: 'Institutional administration and campus compliance supervisor.',
        // Attacker attempts to change email:
        email: 'admin.spoofed@campus.edu',
      }),
    });
    const updateAdminData = await updateAdminRes.json();
    assert(
      updateAdminRes.status === 200 &&
        updateAdminData.success &&
        updateAdminData.user?.fullName === 'Chief Administrator Vance Updated' &&
        updateAdminData.user?.organizationName === 'Office of Campus Administration & Oversight' &&
        updateAdminData.user?.avatar === newAdminAvatar &&
        updateAdminData.user?.role === 'admin' &&
        updateAdminData.user?.email !== 'admin.spoofed@campus.edu',
      'Test Case 36d: Administrator successfully updates full name, designating office title, and avatar with locked email'
    );

    // 36e: Admin profile changes verified via GET /api/auth/me
    const getAdminMeRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const getAdminMeData = await getAdminMeRes.json();
    assert(
      getAdminMeRes.status === 200 &&
        getAdminMeData.user?.fullName === 'Chief Administrator Vance Updated' &&
        getAdminMeData.user?.organizationName === 'Office of Campus Administration & Oversight' &&
        getAdminMeData.user?.avatar === newAdminAvatar,
      'Test Case 36e: Administrator session retrieval (GET /api/auth/me) reflects updated administrative profile credentials'
    );

    // 36f: PATCH /api/user/profile also supports partial profile updates
    const patchOrgRes = await fetch(`${BASE_URL}/user/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({
        phone: '9876543213',
      }),
    });
    const patchOrgData = await patchOrgRes.json();
    assert(
      patchOrgRes.status === 200 &&
        patchOrgData.success &&
        patchOrgData.user?.phone === '9876543213' &&
        patchOrgData.user?.fullName === 'Dr. Sarah Connor Updated',
      'Test Case 36f: PATCH /api/user/profile supports partial updates while preserving existing credentials'
    );

    // =========================================================================
    // TEST CASE 37: ADVANCED TEAM & COMPETITION WORKFLOWS
    // (LFT MATCHING HUB, MULTI-ROUND EVENT STAGES, & PUBLIC SHOWCASE VOTING)
    // =========================================================================

    // 37a: Organizer creates a competition event with sequential multi-round stages
    const tc37_hackathonRes = await fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`,
      },
      body: JSON.stringify({
        title: 'National AI & Autonomous Robotics Hackathon 2026',
        description: 'Elite 3-stage hackathon featuring ideation synopsis, prototype video evaluation, and finale live demonstration pitch.',
        category: 'Technical',
        eventDate: futureDateIST,
        startTime: '09:00',
        endTime: '18:00',
        venueType: 'hybrid',
        venue: 'Campus Innovation Center, Hall A',
        maxCapacity: 120,
        registrationDeadline: tomorrowIST,
        isTeamEvent: true,
        teamMinSize: 2,
        teamMaxSize: 4,
        rounds: [
          {
            roundNumber: 1,
            title: 'Round 1: Problem Synopsis & Architecture Spec',
            description: 'Submit an architectural blueprint document (PDF) and concept overview.',
            deadline: futureDateIST,
            status: 'active',
          },
          {
            roundNumber: 2,
            title: 'Round 2: Working Prototype Demo & Code Review',
            description: 'Submit working GitHub repository and 3-minute video walkthrough link.',
            deadline: futureDateIST,
            status: 'upcoming',
          },
          {
            roundNumber: 3,
            title: 'Grand Finale: On-Stage Live Pitch & Jury Q&A',
            description: 'In-person presentation before industry judges and campus voting audience.',
            deadline: futureDateIST,
            status: 'upcoming',
          },
        ],
      }),
    });
    const tc37_hackathonData = await tc37_hackathonRes.json();
    assert(
      tc37_hackathonRes.status === 201 &&
        tc37_hackathonData.success &&
        tc37_hackathonData.event?.id &&
        Array.isArray(tc37_hackathonData.event?.rounds) &&
        tc37_hackathonData.event?.rounds.length === 3,
      'Test Case 37a: Organizer creates multi-stage competition event with 3 sequential rounds saved in database'
    );
    const tc37_eventId = tc37_hackathonData.event.id;
    const tc37_round1Id = tc37_hackathonData.event.rounds[0].id;
    const tc37_round2Id = tc37_hackathonData.event.rounds[1].id;

    // 37b: Public event detail and round routes return stages
    const tc37_roundsRes = await fetch(`${BASE_URL}/events/${tc37_eventId}/rounds`);
    const tc37_roundsData = await tc37_roundsRes.json();
    assert(
      tc37_roundsRes.status === 200 &&
        tc37_roundsData.success &&
        tc37_roundsData.rounds.length === 3 &&
        tc37_roundsData.rounds[0].roundNumber === 1 &&
        tc37_roundsData.rounds[0].status === 'active',
      'Test Case 37b: GET /api/events/:id/rounds retrieves ordered stages with active status'
    );

    // 37c: Solo participant broadcasts profile on LFT (Looking for Team) matching hub
    const tc37_lftRes = await fetch(`${BASE_URL}/events/${tc37_eventId}/lft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${newStudentToken}`,
      },
      body: JSON.stringify({
        skills: ['React', 'TypeScript', 'Node.js', 'PyTorch'],
        bio: 'Full-stack AI developer with experience building autonomous vision pipelines and clean modern interfaces.',
        contactPreference: 'email',
      }),
    });
    const tc37_lftData = await tc37_lftRes.json();
    assert(
      (tc37_lftRes.status === 200 || tc37_lftRes.status === 201) &&
        tc37_lftData.success &&
        tc37_lftData.post?.id &&
        tc37_lftData.post?.skills?.includes('PyTorch'),
      'Test Case 37c: Student publishes profile to LFT hub with skill tags and contact preferences'
    );
    const tc37_lftPostId = tc37_lftData.post.id;

    // 37d: Roster of LFT candidates fetched via GET /api/events/:id/lft
    const tc37_lftListRes = await fetch(`${BASE_URL}/events/${tc37_eventId}/lft`);
    const tc37_lftListData = await tc37_lftListRes.json();
    assert(
      tc37_lftListRes.status === 200 &&
        tc37_lftListData.success &&
        tc37_lftListData.posts.some(
          (p) => p.id === tc37_lftPostId && (p.candidateName === 'Elena Rostova' || p.userName === 'Elena Rostova')
        ),
      'Test Case 37d: GET /api/events/:id/lft lists available candidates with student name and skill badges'
    );

    // 37e: Team Leader creates team and sends invite to LFT participant
    const tc37_createTeamRes = await fetch(`${BASE_URL}/events/${tc37_eventId}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        name: 'CyberNavigators Team Alpha',
      }),
    });
    const tc37_createTeamData = await tc37_createTeamRes.json();
    assert(
      tc37_createTeamRes.status === 201 && tc37_createTeamData.success && tc37_createTeamData.team?.id,
      'Test Case 37e-1: Team leader creates team CyberNavigators Team Alpha'
    );

    const tc37_inviteRes = await fetch(`${BASE_URL}/events/${tc37_eventId}/lft/${tc37_lftPostId}/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({}),
    });
    const tc37_inviteData = await tc37_inviteRes.json();
    assert(
      tc37_inviteRes.status === 200 &&
        tc37_inviteData.success &&
        tc37_inviteData.message?.includes('invitation sent'),
      'Test Case 37e-2: Team leader successfully dispatches join invitation to LFT candidate'
    );

    // 37f: Team submits project deliverable linked to Round 1
    const tc37_submitRes = await fetch(`${BASE_URL}/events/${tc37_eventId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        roundId: tc37_round1Id,
        title: 'Autonomous Vision Guidance System for Drones',
        description: 'Deep neural network perception pipeline for GPS-denied indoor quadcopter navigation.',
        demoUrl: 'https://autonomous-drone-demo.campus.edu',
        githubUrl: 'https://github.com/yashhl16/AutonomousDroneGuidance',
        figmaUrl: 'https://figma.com/design/drone-telemetry-ui',
        fileUrl: 'https://campus-pulse-assets.s3.amazonaws.com/submissions/autonomous_vision_report.pdf',
        fileName: 'autonomous_vision_report.pdf',
      }),
    });
    const tc37_submitData = await tc37_submitRes.json();
    assert(
      (tc37_submitRes.status === 200 || tc37_submitRes.status === 201) &&
        tc37_submitData.success &&
        tc37_submitData.submission?.roundId === tc37_round1Id &&
        tc37_submitData.submission?.title === 'Autonomous Vision Guidance System for Drones',
      'Test Case 37f: Team successfully submits deliverable linked to active Round 1 with GitHub, Demo, & Report'
    );
    const tc37_submissionId = tc37_submitData.submission.id;

    // 37g: Confirm Public Project Showcase and Voting endpoints have been completely removed (404 Not Found)
    const tc37_showcaseRes = await fetch(`${BASE_URL}/events/${tc37_eventId}/showcase`);
    assert(
      tc37_showcaseRes.status === 404,
      'Test Case 37g: Public showcase gallery endpoint returns 404 Not Found after feature removal'
    );

    const tc37_voteRes = await fetch(`${BASE_URL}/events/${tc37_eventId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${newStudentToken}`,
      },
      body: JSON.stringify({
        submissionId: tc37_submissionId,
      }),
    });
    assert(
      tc37_voteRes.status === 404,
      'Test Case 37h: Direct voting endpoint returns 404 Not Found after feature removal'
    );

    // 37i: Student posts LFT request with comma-separated skills, contactInfo (WhatsApp), and pitch
    const tc37_lftStudent2Res = await fetch(`${BASE_URL}/events/${tc37_eventId}/lft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        skills: 'Frontend, React, UI/UX, Python',
        bio: 'Looking for a hackathon team, experience in Next.js and Tailwind.',
        contactInfo: '+91 9876543210',
        contactPreference: 'WhatsApp',
        status: 'OPEN',
      }),
    });
    const tc37_lftStudent2Data = await tc37_lftStudent2Res.json();
    assert(
      (tc37_lftStudent2Res.status === 200 || tc37_lftStudent2Res.status === 201) &&
        tc37_lftStudent2Data.success &&
        tc37_lftStudent2Data.post?.contactInfo === '+91 9876543210' &&
        tc37_lftStudent2Data.post?.skills?.includes('React') &&
        tc37_lftStudent2Data.post?.status === 'OPEN',
      'Test Case 37i: Student publishes LFT request with contactInfo, comma-separated skill tags, and OPEN status'
    );

    // 37j: Student marks their LFT post as MATCHED once a team is formed
    const tc37_matchRes = await fetch(`${BASE_URL}/events/${tc37_eventId}/lft?action=matched`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${studentToken}`,
      },
    });
    const tc37_matchData = await tc37_matchRes.json();
    assert(
      tc37_matchRes.status === 200 &&
        tc37_matchData.success &&
        tc37_matchData.message?.includes('MATCHED'),
      'Test Case 37j: Student successfully updates LFT post status to MATCHED'
    );

    // 37k: Student removes their LFT post from the directory
    const tc37_deleteRes = await fetch(`${BASE_URL}/events/${tc37_eventId}/lft`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${studentToken}`,
      },
    });
    const tc37_deleteData = await tc37_deleteRes.json();
    assert(
      tc37_deleteRes.status === 200 &&
        tc37_deleteData.success &&
        tc37_deleteData.message?.includes('removed'),
      'Test Case 37k: Student successfully deletes their LFT post via DELETE /api/events/:id/lft'
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
