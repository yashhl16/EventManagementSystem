export const SCHEMA_SQL = `-- Neon PostgreSQL Schema for CampusPulse College Event Management System

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  email VARCHAR(60) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'organizer', 'admin')) DEFAULT 'student',
  student_id VARCHAR(50) DEFAULT '',
  employee_id VARCHAR(50) DEFAULT '',
  admin_id VARCHAR(50) DEFAULT '',
  department VARCHAR(100) DEFAULT 'General',
  graduation_year INT DEFAULT 2026,
  phone VARCHAR(10) DEFAULT '',
  avatar TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
  bio TEXT DEFAULT '',
  interests JSONB DEFAULT '["Technology", "Hackathons", "Workshops"]'::jsonb,
  organization_name VARCHAR(150) DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  banner_image TEXT NOT NULL,
  event_date DATE NOT NULL,
  start_time VARCHAR(20) NOT NULL,
  end_time VARCHAR(20) NOT NULL,
  venue VARCHAR(200) NOT NULL,
  venue_type VARCHAR(20) NOT NULL CHECK (venue_type IN ('offline', 'online', 'hybrid')) DEFAULT 'offline',
  meeting_url TEXT DEFAULT '',
  creator_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
  organizer_name VARCHAR(150) NOT NULL,
  organizer_email VARCHAR(255) NOT NULL,
  department VARCHAR(100) DEFAULT 'Campus Wide',
  max_capacity INT NOT NULL DEFAULT 100,
  registered_count INT NOT NULL DEFAULT 0,
  registration_deadline TIMESTAMPTZ NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  ticket_price NUMERIC(10, 2) DEFAULT 0,
  status VARCHAR(25) NOT NULL CHECK (status IN ('pending_approval', 'approved', 'rejected', 'cancelled', 'completed')) DEFAULT 'pending_approval',
  tags JSONB DEFAULT '[]'::jsonb,
  eligibility TEXT DEFAULT 'Open to all enrolled university students',
  prerequisites TEXT DEFAULT 'None',
  rejection_reason TEXT DEFAULT '',
  is_team_event BOOLEAN DEFAULT false,
  team_size_min INT DEFAULT 1,
  team_size_max INT DEFAULT 4,
  max_team_size INT DEFAULT 4,
  certificate_template_url TEXT DEFAULT '',
  certificate_template_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_registrations (
  id VARCHAR(36) PRIMARY KEY,
  event_id VARCHAR(36) REFERENCES events(id) ON DELETE CASCADE,
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
  ticket_code VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(25) NOT NULL CHECK (status IN ('confirmed', 'waitlisted', 'attended', 'cancelled')) DEFAULT 'confirmed',
  attendance_status VARCHAR(20) DEFAULT 'unmarked',
  registration_date TIMESTAMPTZ DEFAULT NOW(),
  qr_code_data TEXT DEFAULT '',
  team_id VARCHAR(36) DEFAULT NULL,
  team_name VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_event UNIQUE (user_id, event_id)
);

CREATE TABLE IF NOT EXISTS attendances (
  id VARCHAR(36) PRIMARY KEY,
  event_id VARCHAR(36) REFERENCES events(id) ON DELETE CASCADE,
  registration_id VARCHAR(36) REFERENCES event_registrations(id) ON DELETE CASCADE,
  student_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
  ticket_code VARCHAR(50) UNIQUE NOT NULL,
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  verified_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  scan_method VARCHAR(20) DEFAULT 'qr_scan',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certificates (
  id VARCHAR(36) PRIMARY KEY,
  certificate_code VARCHAR(50) UNIQUE NOT NULL,
  certificate_number VARCHAR(50) DEFAULT '',
  student_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
  event_id VARCHAR(36) REFERENCES events(id) ON DELETE CASCADE,
  student_name VARCHAR(150) NOT NULL,
  student_roll VARCHAR(50) DEFAULT '',
  event_title VARCHAR(200) NOT NULL,
  issue_date TIMESTAMPTZ DEFAULT NOW(),
  issued_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  verification_url TEXT NOT NULL,
  pdf_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
  id VARCHAR(36) PRIMARY KEY,
  event_id VARCHAR(36) REFERENCES events(id) ON DELETE CASCADE,
  author_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  admin_email VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id VARCHAR(100) DEFAULT '',
  details TEXT DEFAULT '',
  ip_address VARCHAR(50) DEFAULT '127.0.0.1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  recipient_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'general',
  link TEXT DEFAULT '',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teams (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  leader_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id VARCHAR(36) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  invite_code VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
  id VARCHAR(36) PRIMARY KEY,
  team_id VARCHAR(36) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('Leader', 'Member')) DEFAULT 'Member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_team_user UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS event_rounds (
  id VARCHAR(36) PRIMARY KEY,
  event_id VARCHAR(36) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT DEFAULT '',
  deadline TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL CHECK (status IN ('upcoming', 'active', 'completed')) DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_event_round_number UNIQUE (event_id, round_number)
);

CREATE TABLE IF NOT EXISTS submissions (
  id VARCHAR(36) PRIMARY KEY,
  team_id VARCHAR(36) REFERENCES teams(id) ON DELETE CASCADE,
  event_id VARCHAR(36) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  round_id VARCHAR(36) REFERENCES event_rounds(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT DEFAULT '',
  file_url TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) DEFAULT '',
  file_size INT DEFAULT 0,
  github_url TEXT DEFAULT '',
  figma_url TEXT DEFAULT '',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lft_posts (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id VARCHAR(36) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  skills JSONB DEFAULT '[]'::jsonb,
  bio TEXT DEFAULT '',
  contact_preference VARCHAR(100) DEFAULT 'email',
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_lft_user_event UNIQUE (user_id, event_id)
);

-- Essential Performance & Constraint Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_creator ON events(creator_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user ON event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_ticket ON event_registrations(ticket_code);
CREATE INDEX IF NOT EXISTS idx_attendance_event ON attendances(event_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendances_student_event ON attendances(student_id, event_id);
CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_code ON certificates(certificate_code);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_teams_event ON teams(event_id);
CREATE INDEX IF NOT EXISTS idx_teams_leader ON teams(leader_id);
CREATE INDEX IF NOT EXISTS idx_teams_code ON teams(invite_code);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_team ON submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_submissions_event ON submissions(event_id);
CREATE INDEX IF NOT EXISTS idx_submissions_round ON submissions(round_id);
CREATE INDEX IF NOT EXISTS idx_event_rounds_event ON event_rounds(event_id);
CREATE INDEX IF NOT EXISTS idx_lft_posts_event ON lft_posts(event_id);
CREATE INDEX IF NOT EXISTS idx_lft_posts_user ON lft_posts(user_id);
`;

export default SCHEMA_SQL;
