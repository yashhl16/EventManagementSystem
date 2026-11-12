import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { query, isDatabaseConnected, initSchema } from './db.js';
import { generateTicketCode, generateCertificateCode, generateQRCodeDataUrl } from '../utils/qrHelper.js';

dotenv.config();

/**
 * Idempotently ensure the core 3 demo personas exist with verified bcrypt passwords in Neon PostgreSQL:
 * - Admin: admin@college.edu / Admin@12345
 * - Student: student@college.edu / Student@12345
 * - Organizer: organizer@college.edu / Organizer@12345
 */
export const ensureDemoAccounts = async () => {
  const salt = await bcrypt.genSalt(10);

  // 1. Super Administrator
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@college.edu').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const adminRes = await query('SELECT id, password_hash, is_active FROM users WHERE email = $1', [adminEmail]);

  let adminId;
  if (adminRes.rows.length === 0) {
    adminId = crypto.randomUUID();
    const adminHash = await bcrypt.hash(adminPassword, salt);
    await query(
      `INSERT INTO users (id, name, email, password_hash, role, admin_id, department, phone, avatar, bio, is_active)
       VALUES ($1, $2, $3, $4, 'admin', $5, $6, $7, $8, $9, true)`,
      [
        adminId,
        process.env.ADMIN_NAME || 'Chief Campus Administrator',
        adminEmail,
        adminHash,
        process.env.ADMIN_ID || 'ADM-2026-001',
        'Campus Administration',
        '9876543210',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
        'Oversees campus technical councils, student organization approvals, and inter-collegiate event compliance.',
      ]
    );
    console.log(`[Seed] Super Administrator created in Neon PostgreSQL (${adminEmail}).`);
  } else {
    adminId = adminRes.rows[0].id;
    const isMatch = await bcrypt.compare(adminPassword, adminRes.rows[0].password_hash);
    if (!isMatch || !adminRes.rows[0].is_active) {
      const adminHash = await bcrypt.hash(adminPassword, salt);
      await query('UPDATE users SET password_hash = $1, is_active = true WHERE id = $2', [adminHash, adminId]);
      console.log(`[Seed] Super Administrator credentials synced (${adminEmail}).`);
    }
  }

  // 2. Demo Student
  const studentEmail = 'student@college.edu';
  const studentPassword = 'Student@12345';
  const studentRes = await query('SELECT id, password_hash, is_active FROM users WHERE email = $1', [studentEmail]);

  let studentId;
  if (studentRes.rows.length === 0) {
    studentId = crypto.randomUUID();
    const studentHash = await bcrypt.hash(studentPassword, salt);
    await query(
      `INSERT INTO users (id, name, email, password_hash, role, student_id, department, graduation_year, phone, avatar, bio, interests, is_active)
       VALUES ($1, $2, $3, $4, 'student', $5, $6, $7, $8, $9, $10, $11, true)`,
      [
        studentId,
        'Alex Rivera',
        studentEmail,
        studentHash,
        'CS-2024-0042',
        'Computer Science & Engineering',
        2026,
        '9876543211',
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=300',
        '3rd year CS undergrad. Full-stack enthusiast, hackathon addict, and cloud architect aspirant.',
        JSON.stringify(['Hackathons', 'Artificial Intelligence', 'Web Development', 'Robotics']),
      ]
    );
    console.log(`[Seed] Demo Student created in Neon PostgreSQL (${studentEmail}).`);
  } else {
    studentId = studentRes.rows[0].id;
    const isMatch = await bcrypt.compare(studentPassword, studentRes.rows[0].password_hash);
    if (!isMatch || !studentRes.rows[0].is_active) {
      const studentHash = await bcrypt.hash(studentPassword, salt);
      await query('UPDATE users SET password_hash = $1, is_active = true WHERE id = $2', [studentHash, studentId]);
      console.log(`[Seed] Demo Student credentials verified and synced (${studentEmail}).`);
    }
  }

  // 3. Demo Organizer
  const organizerEmail = 'organizer@college.edu';
  const organizerPassword = 'Organizer@12345';
  const orgRes = await query('SELECT id, password_hash, is_active FROM users WHERE email = $1', [organizerEmail]);

  let organizerId;
  if (orgRes.rows.length === 0) {
    organizerId = crypto.randomUUID();
    const orgHash = await bcrypt.hash(organizerPassword, salt);
    await query(
      `INSERT INTO users (id, name, email, password_hash, role, employee_id, department, organization_name, phone, avatar, bio, is_active)
       VALUES ($1, $2, $3, $4, 'organizer', $5, $6, $7, $8, $9, $10, true)`,
      [
        organizerId,
        'Dr. Sarah Mitchell',
        organizerEmail,
        orgHash,
        'FAC-ENG-402',
        'Computer Science & Engineering',
        'ACM Student Chapter & Coding Club',
        '9876543212',
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300',
        'Faculty advisor for ACM Chapter. Passionate about hackathons, competitive programming, and AI research.',
      ]
    );
    console.log(`[Seed] Demo Organizer created in Neon PostgreSQL (${organizerEmail}).`);
  } else {
    organizerId = orgRes.rows[0].id;
    const isMatch = await bcrypt.compare(organizerPassword, orgRes.rows[0].password_hash);
    if (!isMatch || !orgRes.rows[0].is_active) {
      const orgHash = await bcrypt.hash(organizerPassword, salt);
      await query('UPDATE users SET password_hash = $1, is_active = true WHERE id = $2', [orgHash, organizerId]);
      console.log(`[Seed] Demo Organizer credentials verified and synced (${organizerEmail}).`);
    }
  }

  // 4. Configured System Email User (Ensure user exists for seamless email testing)
  const emailUser = (process.env.EMAIL_USER || '').trim().toLowerCase();
  if (emailUser && emailUser.includes('@') && emailUser !== 'your-email@gmail.com') {
    const emailRes = await query('SELECT id, password_hash FROM users WHERE LOWER(email) = $1', [emailUser]);
    if (emailRes.rows.length === 0) {
      const emailUserId = crypto.randomUUID();
      const defaultHash = await bcrypt.hash('JurisFlow@2026', salt);
      await query(
        `INSERT INTO users (id, name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, 'student', true)`,
        [emailUserId, 'JurisFlow Member', emailUser, defaultHash]
      );
      console.log(`[Seed] System email user account created in database (${emailUser}).`);
    }
  }

  return { adminId, studentId, organizerId };
};

/**
 * Initialize core database personas (Admin, Student, Organizer)
 * Note: Sample dummy events have been decoupled to ensure only genuine database records are served.
 */
export const seedDatabase = async () => {
  try {
    await initSchema();
    await ensureDemoAccounts();
    console.log('[Seed] Core demo authentication accounts verified in Neon PostgreSQL.');
  } catch (err) {
    console.error('[Seed] Error initializing demo accounts in Neon PostgreSQL:', err.message);
  }
};

/**
 * Optional developer utility to seed sample college events for offline testing.
 * Only executed if explicitly invoked via CLI with --seed-sample-events.
 */
export const seedSampleEvents = async () => {
  try {
    await initSchema();
    const { adminId, studentId, organizerId } = await ensureDemoAccounts();

    const eventCountRes = await query('SELECT COUNT(*) as count FROM events');
    const eventCount = parseInt(eventCountRes.rows[0].count, 10);

    if (eventCount > 0) {
      console.log(`[Seed] Neon PostgreSQL already contains ${eventCount} events. Skipping sample seeding.`);
      return;
    }

    console.log('[Seed] Populating realistic collegiate events and records into Neon PostgreSQL...');

    const now = new Date();
    const futureDate = (days) => {
      const d = new Date(now);
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    // Events
    const event1Id = crypto.randomUUID();
    const event2Id = crypto.randomUUID();
    const event3Id = crypto.randomUUID();
    const event4Id = crypto.randomUUID();
    const event5Id = crypto.randomUUID();
    const event6Id = crypto.randomUUID();

    // 1. AI Horizon Hackathon (Approved)
    await query(
      `INSERT INTO events (id, title, description, category, banner_image, event_date, start_time, end_time, venue, venue_type, creator_id, organizer_name, organizer_email, department, max_capacity, registered_count, registration_deadline, is_paid, ticket_price, status, tags, is_team_event, team_size_min, team_size_max)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'offline', $10, $11, $12, $13, 200, 1, $14, false, 0, 'approved', $15, true, 2, 4)`,
      [
        event1Id,
        'AI Horizon 2026: 36-Hour National Hackathon',
        'Join the largest collegiate hackathon of the semester! Build generative AI solutions, autonomous agents, and computer vision systems. Mentorship from Google DeepMind engineers and $10,000 in prizes.',
        'Hackathon',
        'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=1200',
        futureDate(14),
        '09:00 AM',
        '09:00 PM',
        'Campus Innovation Hub - Grand Auditorium',
        organizerId,
        'Dr. Sarah Mitchell',
        'organizer@college.edu',
        'Computer Science & Engineering',
        new Date(Date.now() + 10 * 86400000),
        JSON.stringify(['Hackathon', 'Artificial Intelligence', 'Machine Learning', 'Coding']),
      ]
    );

    // 2. Cloud Native Workshop (Approved)
    await query(
      `INSERT INTO events (id, title, description, category, banner_image, event_date, start_time, end_time, venue, venue_type, creator_id, organizer_name, organizer_email, department, max_capacity, registered_count, registration_deadline, is_paid, ticket_price, status, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'hybrid', $10, $11, $12, $13, 80, 1, $14, false, 0, 'approved', $15)`,
      [
        event2Id,
        'Mastering Cloud-Native Microservices with Kubernetes',
        'Hands-on interactive lab setting up production-grade clusters on AWS, deploying Docker containers, and managing ingress traffic with Istio service mesh.',
        'Workshop',
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200',
        futureDate(5),
        '02:00 PM',
        '05:30 PM',
        'Turing Computer Lab 3 & Google Meet',
        organizerId,
        'Dr. Sarah Mitchell',
        'organizer@college.edu',
        'Computer Science & Engineering',
        new Date(Date.now() + 4 * 86400000),
        JSON.stringify(['Workshop', 'Cloud Computing', 'Docker', 'Kubernetes']),
      ]
    );

    // 3. CyberDefend CTF (Pending Approval for testing Admin moderation queue!)
    await query(
      `INSERT INTO events (id, title, description, category, banner_image, event_date, start_time, end_time, venue, venue_type, creator_id, organizer_name, organizer_email, department, max_capacity, registered_count, registration_deadline, is_paid, ticket_price, status, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'online', $10, $11, $12, $13, 150, 0, $14, false, 0, 'pending_approval', $15)`,
      [
        event3Id,
        'CyberDefend 2026: Campus Capture The Flag (CTF)',
        'Test your penetration testing, cryptography, binary reverse-engineering, and web security skills across realistic jeopardy-style cyber security challenges.',
        'Technical',
        'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=1200',
        futureDate(20),
        '10:00 AM',
        '06:00 PM',
        'Discord Cyber Range Portal',
        organizerId,
        'Dr. Sarah Mitchell',
        'organizer@college.edu',
        'Cyber Security Club',
        new Date(Date.now() + 18 * 86400000),
        JSON.stringify(['CyberSecurity', 'CTF', 'Ethical Hacking', 'Reverse Engineering']),
      ]
    );

    // 4. RoboWars Expo (Approved)
    await query(
      `INSERT INTO events (id, title, description, category, banner_image, event_date, start_time, end_time, venue, venue_type, creator_id, organizer_name, organizer_email, department, max_capacity, registered_count, registration_deadline, is_paid, ticket_price, status, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'offline', $10, $11, $12, $13, 300, 0, $14, false, 0, 'approved', $15)`,
      [
        event4Id,
        'RoboWars 2026: Autonomous Combat Arena & Drone Racing',
        'Witness 15kg and 30kg custom combat robots clash in high-impact ballistic arena matches alongside high-speed FPV drone obstacle courses.',
        'Sports',
        'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=1200',
        futureDate(25),
        '11:00 AM',
        '07:00 PM',
        'College Open Air Amphitheatre',
        organizerId,
        'Dr. Sarah Mitchell',
        'organizer@college.edu',
        'Robotics & Automation Society',
        new Date(Date.now() + 22 * 86400000),
        JSON.stringify(['Robotics', 'Drone Racing', 'Combat Bots', 'Hardware']),
      ]
    );

    // 5. Cultural Fest (Approved)
    await query(
      `INSERT INTO events (id, title, description, category, banner_image, event_date, start_time, end_time, venue, venue_type, creator_id, organizer_name, organizer_email, department, max_capacity, registered_count, registration_deadline, is_paid, ticket_price, status, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'offline', $10, $11, $12, $13, 500, 0, $14, false, 0, 'approved', $15)`,
      [
        event5Id,
        'Tarang 2026: Annual University Cultural & Musical Odyssey',
        'A night of soul-stirring acoustic performances, rock band battles, street plays, and dance showcases with celebrity guest performers.',
        'Cultural',
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=1200',
        futureDate(30),
        '05:00 PM',
        '11:00 PM',
        'University Sports Complex Arena',
        organizerId,
        'Dr. Sarah Mitchell',
        'organizer@college.edu',
        'Cultural Affairs Board',
        new Date(Date.now() + 28 * 86400000),
        JSON.stringify(['Cultural', 'Music', 'Dance', 'Festival']),
      ]
    );

    // 6. Registrations & Tickets for Student
    const reg1Id = crypto.randomUUID();
    const ticket1Code = generateTicketCode();
    const qr1 = await generateQRCodeDataUrl(ticket1Code);

    await query(
      `INSERT INTO event_registrations (id, event_id, user_id, ticket_code, status, qr_code_data, team_name)
       VALUES ($1, $2, $3, $4, 'confirmed', $5, 'Neural Knights')`,
      [reg1Id, event1Id, studentId, ticket1Code, qr1]
    );

    const reg2Id = crypto.randomUUID();
    const ticket2Code = generateTicketCode();
    const qr2 = await generateQRCodeDataUrl(ticket2Code);

    await query(
      `INSERT INTO event_registrations (id, event_id, user_id, ticket_code, status, qr_code_data)
       VALUES ($1, $2, $3, $4, 'attended', $5)`,
      [reg2Id, event2Id, studentId, ticket2Code, qr2]
    );

    // Attendance record for attended event
    await query(
      `INSERT INTO attendances (id, event_id, registration_id, student_id, ticket_code, checked_in_at, verified_by, scan_method)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6, 'qr_scan')`,
      [crypto.randomUUID(), event2Id, reg2Id, studentId, ticket2Code, organizerId]
    );

    // Verifiable Certificate
    const certCode = generateCertificateCode();
    await query(
      `INSERT INTO certificates (id, certificate_code, student_id, event_id, student_name, student_roll, event_title, issue_date, issued_by, verification_url)
       VALUES ($1, $2, $3, $4, 'Alex Rivera', 'CS-2024-0042', 'Mastering Cloud-Native Microservices with Kubernetes', NOW(), $5, $6)`,
      [crypto.randomUUID(), certCode, studentId, event2Id, organizerId, `http://localhost:5173/verify/${certCode}`]
    );

    // Announcements
    await query(
      `INSERT INTO announcements (id, event_id, author_id, title, message, priority)
       VALUES ($1, $2, $3, $4, $5, 'important')`,
      [
        crypto.randomUUID(),
        event1Id,
        organizerId,
        'Hacker Guide & API Keys Released',
        'Welcome all participants! Please check the official Discord channels for workshop pre-requisites and sandbox API credits.',
      ]
    );

    // Audit Log
    await query(
      `INSERT INTO audit_logs (id, user_id, admin_email, action, target_type, target_id, details)
       VALUES ($1, $2, $3, 'EVENT_MODERATION', 'EVENT', $4, 'Approved event: AI Horizon 2026')`,
      [crypto.randomUUID(), adminId, 'admin@college.edu', event1Id]
    );

    console.log('[Seed] Neon PostgreSQL realistic database initialization complete!');
  } catch (err) {
    console.error('[Seed] Error seeding Neon PostgreSQL database:', err.message);
  }
};

// Auto-run if executed directly as a script
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  if (process.argv.includes('--seed-sample-events')) {
    seedSampleEvents().then(() => process.exit(0)).catch(() => process.exit(1));
  } else {
    seedDatabase().then(() => process.exit(0)).catch(() => process.exit(1));
  }
}
