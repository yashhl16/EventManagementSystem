import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SCHEMA_SQL } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded whether running from project root, server directory, or serverless function
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../server/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;

/**
 * Dynamic Neon PostgreSQL connection string resolver
 * Resolves standard Neon & Vercel environment variables dynamically
 */
export const getConnectionString = () => {
  const raw = (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.NEON_DATABASE_URL ||
    process.env.NEON_URL ||
    process.env.POSTGRES_URL_NO_SSL ||
    process.env.VERCEL_POSTGRES_URL ||
    process.env.DB_URL ||
    process.env.DATABASE_URI ||
    (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD
      ? `postgres://${encodeURIComponent(process.env.PGUSER)}:${encodeURIComponent(process.env.PGPASSWORD)}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'neondb'}?sslmode=require`
      : null) ||
    (process.env.POSTGRES_HOST && process.env.POSTGRES_USER && process.env.POSTGRES_PASSWORD
      ? `postgres://${encodeURIComponent(process.env.POSTGRES_USER)}:${encodeURIComponent(process.env.POSTGRES_PASSWORD)}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DATABASE || 'neondb'}?sslmode=require`
      : null)
  );

  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/^["']|["']$/g, '');
  return trimmed || null;
};

let isReady = false;
let isSchemaInitialized = false;

// Global pool reuse for Vercel Serverless Functions
const getActivePool = () => {
  if (global.__neonPgPool) {
    return global.__neonPgPool;
  }
  return null;
};

const setActivePool = (p) => {
  global.__neonPgPool = p;
};

export const pool = {
  query: async (...args) => {
    const p = getActivePool();
    if (!p) {
      await connectDB();
      return getActivePool().query(...args);
    }
    return p.query(...args);
  },
  connect: async (...args) => {
    const p = getActivePool();
    if (!p) {
      await connectDB();
      return getActivePool().connect(...args);
    }
    return p.connect(...args);
  },
  end: async (...args) => {
    const p = getActivePool();
    if (p && p.end) return p.end(...args);
    return Promise.resolve();
  },
};

export const query = async (text, params) => {
  const p = getActivePool();
  if (!p) {
    await connectDB();
    return getActivePool().query(text, params);
  }
  return p.query(text, params);
};

export const getClient = async () => {
  const p = getActivePool();
  if (!p) {
    await connectDB();
    return getActivePool().connect();
  }
  return p.connect();
};

export const isDatabaseConnected = () => {
  return isReady && !!getActivePool();
};

/**
 * Returns safe database metadata without leaking credentials
 */
export const getSafeDatabaseInfo = async () => {
  const connStr = getConnectionString();
  const isVercel = !!process.env.VERCEL;
  const isProd = process.env.NODE_ENV === 'production';
  const currentPool = getActivePool();

  let hostMasked = 'none';
  if (connStr) {
    try {
      const parsed = new URL(connStr.replace(/^postgres:/, 'http:'));
      const host = parsed.hostname;
      if (host.length > 8) {
        hostMasked = `${host.slice(0, 3)}***${host.slice(-4)}`;
      } else {
        hostMasked = 'configured';
      }
    } catch (_) {
      hostMasked = 'configured';
    }
  }

  if (!currentPool) {
    return {
      connected: false,
      ready: false,
      isMemory: false,
      environment: isVercel ? 'vercel' : (isProd ? 'production' : 'development'),
      connectionConfigured: !!connStr,
      host: hostMasked,
    };
  }

  let dbName = 'neondb';
  let serverTime = null;
  let isMemory = false;

  try {
    const res = await currentPool.query('SELECT NOW() as server_time');
    if (res && res.rows && res.rows[0]) {
      serverTime = res.rows[0].server_time;
    }
    try {
      const dbRes = await currentPool.query('SELECT current_database() as db_name');
      if (dbRes?.rows?.[0]?.db_name) {
        dbName = dbRes.rows[0].db_name;
      }
    } catch (_) {
      dbName = connStr ? 'neondb' : 'local_memory';
    }

    if (currentPool.constructor && (currentPool.constructor.name === 'MemPool' || !connStr)) {
      isMemory = true;
    }
  } catch (err) {
    return {
      connected: false,
      ready: false,
      error: err.message,
      environment: isVercel ? 'vercel' : (isProd ? 'production' : 'development'),
      connectionConfigured: !!connStr,
      host: hostMasked,
    };
  }

  return {
    connected: isReady && !!currentPool,
    ready: isReady,
    databaseName: dbName,
    serverTime,
    isMemory,
    environment: isVercel ? 'vercel' : (isProd ? 'production' : 'development'),
    host: hostMasked,
  };
};

/**
 * Initialize schema tables and indexes in Neon PostgreSQL
 */
export const initSchema = async () => {
  if (isSchemaInitialized) return true;
  const currentPool = getActivePool();
  if (!currentPool) {
    console.warn('[DB] Database pool not ready for schema initialization.');
    return false;
  }

  try {
    // Execute bundled schema SQL directly (guaranteed to be available in serverless environments)
    if (SCHEMA_SQL) {
      await currentPool.query(SCHEMA_SQL);
    } else {
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf8');
        await currentPool.query(sql);
      }
    }

    // Safe progressive non-destructive migrations for existing Neon database instances
    const migrations = [
      `ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "round_id" TEXT;`,
      `ALTER TABLE submissions ADD COLUMN IF NOT EXISTS round_id TEXT;`,
      `ALTER TABLE submissions ALTER COLUMN round_id DROP NOT NULL;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS student_id VARCHAR(50) DEFAULT '';`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50) DEFAULT '';`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_id VARCHAR(50) DEFAULT '';`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'General';`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS graduation_year INT DEFAULT 2026;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30) DEFAULT '';`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS interests JSONB DEFAULT '["Technology", "Hackathons"]'::jsonb;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;`,
      `ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS attendance_status VARCHAR(20) DEFAULT 'unmarked';`,
      `ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS qr_code_data TEXT DEFAULT '';`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_attendances_student_event ON attendances(student_id, event_id);`,
      `CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));`,
      // Safe data normalization before column constraint tightening
      `UPDATE users SET name = SUBSTRING(name, 1, 60) WHERE length(name) > 60;`,
      `UPDATE users SET email = SUBSTRING(email, 1, 60) WHERE length(email) > 60;`,
      `UPDATE users SET phone = SUBSTRING(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 1, 10) WHERE length(phone) > 10;`,
      // Enforce column types VARCHAR(60) for name & email, VARCHAR(10) for phone
      `ALTER TABLE users ALTER COLUMN name TYPE VARCHAR(60);`,
      `ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(60);`,
      `ALTER TABLE users ALTER COLUMN phone TYPE VARCHAR(10);`,
      // Field length & integrity constraints
      `ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_name_len;`,
      `ALTER TABLE users ADD CONSTRAINT chk_users_name_len CHECK (length(trim(name)) >= 2 AND length(name) <= 60);`,
      `ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_email_len;`,
      `ALTER TABLE users ADD CONSTRAINT chk_users_email_len CHECK (length(email) <= 60);`,
      `ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_phone_len;`,
      `ALTER TABLE users ADD CONSTRAINT chk_users_phone_len CHECK (phone IS NULL OR phone = '' OR (length(phone) = 10 AND phone ~ '^[0-9]{10}$'));`,
      `ALTER TABLE events ADD CONSTRAINT chk_events_title_len CHECK (length(trim(title)) >= 3 AND length(title) <= 150);`,
      `ALTER TABLE events ADD CONSTRAINT chk_events_desc_len CHECK (length(description) <= 5000);`,
      `ALTER TABLE events ADD CONSTRAINT chk_events_venue_len CHECK (length(venue) <= 200);`,
      `ALTER TABLE events ADD CONSTRAINT chk_events_start_time_len CHECK (start_time IS NULL OR (length(start_time) >= 1 AND length(start_time) <= 50));`,
      `ALTER TABLE events ADD CONSTRAINT chk_events_end_time_len CHECK (end_time IS NULL OR (length(end_time) >= 1 AND length(end_time) <= 50));`,
      `ALTER TABLE announcements ADD CONSTRAINT chk_announcements_title_len CHECK (length(trim(title)) >= 3 AND length(trim(title)) <= 200);`,
      `ALTER TABLE announcements ADD CONSTRAINT chk_announcements_msg_len CHECK (length(message) <= 2000);`,
      `ALTER TABLE event_registrations ADD CONSTRAINT chk_registrations_team_name CHECK (team_name IS NULL OR length(team_name) <= 100);`,
      `ALTER TABLE events ADD COLUMN IF NOT EXISTS allow_teams BOOLEAN DEFAULT false;`,
      `ALTER TABLE events ADD COLUMN IF NOT EXISTS is_team_event BOOLEAN DEFAULT false;`,
      `ALTER TABLE events ADD COLUMN IF NOT EXISTS max_team_size INT DEFAULT 4;`,
      `ALTER TABLE events ADD COLUMN IF NOT EXISTS team_size_min INT DEFAULT 1;`,
      `ALTER TABLE events ADD COLUMN IF NOT EXISTS team_size_max INT DEFAULT 4;`,
      `ALTER TABLE events ADD COLUMN IF NOT EXISTS certificate_template_url TEXT DEFAULT '';`,
      `ALTER TABLE events ADD COLUMN IF NOT EXISTS certificate_template_config JSONB DEFAULT '{}'::jsonb;`,
      `ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS team_id VARCHAR(36);`,
      `ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS is_team_registration BOOLEAN DEFAULT false;`,
      `CREATE TABLE IF NOT EXISTS teams (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        leader_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_id VARCHAR(36) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        invite_code VARCHAR(20) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );`,
      `CREATE TABLE IF NOT EXISTS team_members (
        id VARCHAR(36) PRIMARY KEY,
        team_id VARCHAR(36) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('Leader', 'Member')) DEFAULT 'Member',
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_team_user UNIQUE (team_id, user_id)
      );`,
      `CREATE TABLE IF NOT EXISTS event_rounds (
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
      );`,
      `CREATE TABLE IF NOT EXISTS submissions (
        id VARCHAR(36) PRIMARY KEY,
        team_id VARCHAR(36) REFERENCES teams(id) ON DELETE CASCADE,
        event_id VARCHAR(36) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
        round_id VARCHAR(36) REFERENCES event_rounds(id) ON DELETE SET NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT DEFAULT '',
        file_url TEXT DEFAULT '',
        document_url TEXT DEFAULT '',
        file_type VARCHAR(255) DEFAULT 'application/octet-stream',
        file_name VARCHAR(255) DEFAULT '',
        file_size INT DEFAULT 0,
        github_url TEXT DEFAULT '',
        figma_url TEXT DEFAULT '',
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );`,
      `ALTER TABLE submissions ADD COLUMN IF NOT EXISTS round_id VARCHAR(36) DEFAULT NULL;`,
      `ALTER TABLE submissions ALTER COLUMN round_id DROP NOT NULL;`,
      `ALTER TABLE submissions ALTER COLUMN file_type TYPE VARCHAR(255);`,
      `ALTER TABLE submissions ALTER COLUMN file_url DROP NOT NULL;`,
      `ALTER TABLE submissions ADD COLUMN IF NOT EXISTS document_url TEXT DEFAULT '';`,
      `ALTER TABLE submissions ALTER COLUMN description DROP NOT NULL;`,
      `CREATE INDEX IF NOT EXISTS idx_submissions_round ON submissions(round_id);`,
      `CREATE INDEX IF NOT EXISTS idx_teams_event ON teams(event_id);`,
      `CREATE INDEX IF NOT EXISTS idx_teams_leader ON teams(leader_id);`,
      `CREATE INDEX IF NOT EXISTS idx_teams_code ON teams(invite_code);`,
      `CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);`,
      `CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_submissions_team ON submissions(team_id);`,
      `CREATE INDEX IF NOT EXISTS idx_submissions_event ON submissions(event_id);`,
      `ALTER TABLE certificates ADD COLUMN IF NOT EXISTS certificate_number VARCHAR(50);`,
      `ALTER TABLE certificates ADD COLUMN IF NOT EXISTS pdf_url TEXT DEFAULT '';`,
      `UPDATE certificates SET certificate_number = certificate_code WHERE certificate_number IS NULL OR certificate_number = '';`,
      `CREATE INDEX IF NOT EXISTS idx_certificates_number ON certificates(certificate_number);`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_student_event ON certificates(student_id, event_id);`,
      `CREATE TABLE IF NOT EXISTS lft_posts (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_id VARCHAR(36) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        skills JSONB DEFAULT '[]'::jsonb,
        bio TEXT DEFAULT '',
        contact_preference VARCHAR(100) DEFAULT 'email',
        contact_info VARCHAR(255) DEFAULT '',
        status VARCHAR(20) DEFAULT 'OPEN',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_lft_user_event UNIQUE (user_id, event_id)
      );`,
      `ALTER TABLE lft_posts ADD COLUMN IF NOT EXISTS contact_info VARCHAR(255) DEFAULT '';`,
      `DROP TABLE IF EXISTS votes CASCADE;`,
      `CREATE INDEX IF NOT EXISTS idx_submissions_round ON submissions(round_id);`,
      `CREATE INDEX IF NOT EXISTS idx_event_rounds_event ON event_rounds(event_id);`,
      `CREATE INDEX IF NOT EXISTS idx_lft_posts_event ON lft_posts(event_id);`,
      `CREATE INDEX IF NOT EXISTS idx_lft_posts_user ON lft_posts(user_id);`,
      // Safe targeted purge of legacy seed dummy events on Neon
      `DELETE FROM events WHERE title IN ('AI Horizon 2026: 36-Hour National Hackathon', 'Mastering Cloud-Native Microservices with Kubernetes', 'CyberDefend 2026: Campus Capture The Flag (CTF)', 'RoboWars 2026: Autonomous Combat Arena & Drone Racing', 'Tarang 2026: Annual University Cultural & Musical Odyssey') AND organizer_email = 'organizer@college.edu';`,
      `DELETE FROM announcements WHERE title = 'Hacker Guide & API Keys Released';`,
      `DELETE FROM audit_logs WHERE details = 'Approved event: AI Horizon 2026';`
    ];

    for (const statement of migrations) {
      try {
        await currentPool.query(statement);
      } catch (_) {
        // Safe to ignore if already applied
      }
    }

    console.log('[DB] Neon PostgreSQL schema verified & initialized successfully.');
    isSchemaInitialized = true;
    isReady = true;
    return true;
  } catch (err) {
    console.error('[DB] Failed to execute schema initialization:', err.message);
    throw err;
  }
};

export const connectDB = async () => {
  let existingPool = getActivePool();
  if (isReady && existingPool) {
    return;
  }

  const connStr = getConnectionString();
  const isVercel = !!process.env.VERCEL;
  const isProduction = process.env.NODE_ENV === 'production';

  if (connStr) {
    try {
      console.log('[DB] Initializing Neon PostgreSQL pool connection...');
      const isLocal = connStr.includes('localhost') || connStr.includes('127.0.0.1');

      // Strip query parameters like sslmode from URL to prevent pg-connection-string
      // from overriding our explicit SSL object with strict CA requirements
      let cleanConnStr = connStr;
      let hostHeader = undefined;
      try {
        const parsed = new URL(connStr.replace(/^postgres:/, 'http:'));
        hostHeader = parsed.hostname;
      } catch (_) {}

      if (cleanConnStr.includes('sslmode=')) {
        cleanConnStr = cleanConnStr.replace(/([?&])sslmode=[^&]+(&|$)/g, '$1');
        cleanConnStr = cleanConnStr.replace(/[?&]$/, '');
      }

      const sslConfig = isLocal
        ? false
        : {
            rejectUnauthorized: false,
            ...(hostHeader ? { servername: hostHeader } : {}),
          };

      const newPool = new Pool({
        connectionString: cleanConnStr,
        ssl: sslConfig,
        max: isVercel ? 2 : 10,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 10000,
      });

      const client = await newPool.connect();
      const res = await client.query('SELECT NOW() as server_time, current_database() as db_name');
      try {
        await client.query('ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "round_id" TEXT;');
        await client.query('ALTER TABLE submissions ADD COLUMN IF NOT EXISTS round_id TEXT;');
        await client.query('ALTER TABLE submissions ALTER COLUMN round_id DROP NOT NULL;');
      } catch (colErr) {
        // Safe to ignore if table doesn't exist yet before initSchema
      }
      client.release();

      setActivePool(newPool);
      console.log(`[DB] Connected to Neon PostgreSQL [${res.rows[0].db_name}] at ${res.rows[0].server_time}`);
      await initSchema();
      isReady = true;
    } catch (err) {
      console.error(`[DB] Neon PostgreSQL connection failed: ${err.message}`);
      isReady = false;
      throw err;
    }
  } else {
    // In production or Vercel, NEVER silently switch to memory DB
    if (isVercel || isProduction) {
      const errorMsg = '[DB] Neon PostgreSQL connection string not found. Please add DATABASE_URL or POSTGRES_URL to your Vercel Project Environment Variables.';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Only in local development / offline testing, initialize pg-mem
    try {
      console.log('[DB] DATABASE_URL not set in local dev environment. Initializing local pg-mem PostgreSQL engine...');
      const { newDb } = await import('pg-mem');
      const memDb = newDb();
      memDb.registerExtension('uuid-ossp', (schema) => {
        schema.registerFunction({
          name: 'uuid_generate_v4',
          returns: memDb.public.getType('text'),
          implementation: () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : '00000000-0000-0000-0000-000000000001'),
        });
      });
      memDb.registerExtension('pgcrypto', (schema) => {
        schema.registerFunction({
          name: 'gen_random_uuid',
          returns: memDb.public.getType('text'),
          implementation: () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : '00000000-0000-0000-0000-000000000001'),
        });
      });
      memDb.public.registerFunction({
        name: 'current_database',
        implementation: () => 'campus_pulse_local',
      });
      const { Pool: MemPool } = memDb.adapters.createPg();
      setActivePool(new MemPool());
      await initSchema();
      console.log('[DB] Local PostgreSQL engine active with full schema support.');
      isReady = true;
    } catch (err) {
      console.error('[DB] Error initializing local PostgreSQL engine:', err.message);
      throw err;
    }
  }
};

export const closeDB = async () => {
  const p = getActivePool();
  if (p && p.end) {
    await p.end();
  }
  setActivePool(null);
  isReady = false;
};


/* ================= ROW MAPPERS (CamelCase for React Compatibility) ================= */

export const mapUser = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    fullName: row.name,
    email: row.email,
    username: row.email ? row.email.split('@')[0] : '',
    role: row.role,
    studentId: row.student_id || '',
    rollNumber: row.student_id || '',
    employeeId: row.employee_id || '',
    adminId: row.admin_id || '',
    department: row.department || 'General',
    graduationYear: row.graduation_year || 2026,
    phone: row.phone || '',
    avatar: row.avatar || '',
    avatarUrl: row.avatar || '',
    profilePicture: row.avatar || '',
    bio: row.bio || '',
    interests: Array.isArray(row.interests) ? row.interests : (typeof row.interests === 'string' ? JSON.parse(row.interests) : []),
    organizationName: row.organization_name || '',
    isActive: row.is_active !== false,
    lastLogin: row.last_login,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const computeEventTimestamps = (eventDateVal, startTimeStr, endTimeStr, rawStatus) => {
  const pad = (n) => String(n).padStart(2, '0');
  let dateStr = '';
  if (eventDateVal instanceof Date) {
    const year = eventDateVal.getFullYear();
    const month = pad(eventDateVal.getMonth() + 1);
    const day = pad(eventDateVal.getDate());
    dateStr = `${year}-${month}-${day}`;
  } else if (typeof eventDateVal === 'string') {
    dateStr = eventDateVal.split('T')[0];
  }

  const parseTime = (timeStr, defaultTime) => {
    const raw = (timeStr && timeStr.trim().length > 0 ? timeStr : defaultTime).trim();
    const ampmMatch = raw.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    if (ampmMatch) {
      hours = parseInt(ampmMatch[1], 10);
      minutes = parseInt(ampmMatch[2], 10);
      seconds = ampmMatch[3] ? parseInt(ampmMatch[3], 10) : 0;
      const modifier = ampmMatch[4]?.toUpperCase();
      if (modifier === 'PM' && hours < 12) hours += 12;
      else if (modifier === 'AM' && hours === 12) hours = 0;
    } else {
      const parts = raw.split(':');
      hours = parseInt(parts[0], 10) || 0;
      minutes = parseInt(parts[1], 10) || 0;
      seconds = parseInt(parts[2], 10) || 0;
    }
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const iso = `${dateStr}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
      const d = new Date(iso);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  };

  const startDate = parseTime(startTimeStr, '00:00');
  let endDate = parseTime(endTimeStr, '23:59:59');
  if (startDate && (!endDate || endDate <= startDate)) {
    endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  }

  let eventStatus = 'Upcoming';
  if (rawStatus === 'completed') {
    eventStatus = 'Completed';
  } else if (startDate && endDate) {
    const now = new Date().getTime();
    if (now < startDate.getTime()) {
      eventStatus = 'Upcoming';
    } else if (now >= startDate.getTime() && now <= endDate.getTime()) {
      eventStatus = 'Ongoing';
    } else {
      eventStatus = 'Completed';
    }
  }

  return {
    dateStr,
    startDate: startDate ? startDate.toISOString() : null,
    endDate: endDate ? endDate.toISOString() : null,
    eventStatus,
  };
};

export const mapEvent = (row) => {
  if (!row) return null;
  const { dateStr, startDate, endDate, eventStatus } = computeEventTimestamps(
    row.event_date,
    row.start_time,
    row.end_time,
    row.status
  );
  return {
    _id: row.id,
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    bannerImage: row.banner_image,
    eventDate: dateStr || (row.event_date ? (row.event_date.toISOString ? row.event_date.toISOString().split('T')[0] : String(row.event_date).split('T')[0]) : ''),
    startTime: row.start_time,
    endTime: row.end_time,
    startDate,
    endDate,
    eventStatus,
    venue: row.venue,
    venueType: row.venue_type,
    meetingUrl: row.meeting_url || '',
    creatorId: row.creator_id,
    organizer: {
      name: row.creator_name || row.organizer_name,
      email: row.creator_email || row.organizer_email,
      department: row.creator_department || row.department,
      avatar: row.creator_avatar || '',
      organizationName: row.creator_organization_name || row.organization_name || '',
    },
    organizerName: row.creator_name || row.organizer_name,
    organizerEmail: row.creator_email || row.organizer_email,
    department: row.department,
    maxCapacity: Number(row.max_capacity) || 100,
    registeredCount: Number(row.registered_count) || 0,
    registrationDeadline: row.registration_deadline,
    isPaid: !!row.is_paid,
    ticketPrice: Number(row.ticket_price) || 0,
    status: row.status,
    tags: Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? JSON.parse(row.tags) : []),
    eligibility: row.eligibility || 'Open to all enrolled university students',
    prerequisites: row.prerequisites || 'None',
    rejectionReason: row.rejection_reason || '',
    allowTeams: !!(row.allow_teams !== undefined ? row.allow_teams : row.is_team_event),
    isTeamEvent: !!(row.is_team_event || row.allow_teams),
    maxTeamSize: Number(row.max_team_size || row.team_size_max) || 4,
    teamSize: {
      min: row.team_size_min || 1,
      max: row.team_size_max || row.max_team_size || 4,
    },
    certificateTemplateUrl: row.certificate_template_url || '',
    certificateTemplateConfig:
      typeof row.certificate_template_config === 'string'
        ? JSON.parse(row.certificate_template_config)
        : (row.certificate_template_config || null),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const mapRegistration = (row) => {
  if (!row) return null;
  const eventTimestamps = row.event_date
    ? computeEventTimestamps(row.event_date, row.event_start_time, row.event_end_time, row.event_status)
    : { startDate: null, endDate: null, eventStatus: 'Upcoming' };

  const resolvedRegDate = row.registration_date || row.registered_at || row.created_at || new Date().toISOString();

  return {
    _id: row.id,
    id: row.id,
    eventId: row.event_id,
    event: row.event_title ? {
      _id: row.event_id,
      id: row.event_id,
      title: row.event_title,
      category: row.event_category,
      eventDate: row.event_date ? (row.event_date.toISOString ? row.event_date.toISOString().split('T')[0] : row.event_date) : '',
      startTime: row.event_start_time,
      endTime: row.event_end_time,
      startDate: eventTimestamps.startDate,
      endDate: eventTimestamps.endDate,
      eventStatus: eventTimestamps.eventStatus,
      venue: row.event_venue,
      bannerImage: row.event_banner,
      status: row.event_status,
    } : row.event_id,
    userId: row.user_id,
    user: row.user_name ? {
      _id: row.user_id,
      id: row.user_id,
      name: row.user_name,
      fullName: row.user_name,
      email: row.user_email,
      studentId: row.user_student_id || '',
      rollNumber: row.user_student_id || '',
      department: row.user_department || 'General',
      phone: row.user_phone || '',
    } : (typeof row.user === 'object' && row.user !== null ? {
      ...row.user,
      fullName: row.user.fullName || row.user.name,
      rollNumber: row.user.rollNumber || row.user.studentId,
    } : {
      _id: row.user_id,
      id: row.user_id,
      name: '',
      fullName: '',
      studentId: '',
      rollNumber: '',
      department: 'General',
    }),
    ticketCode: row.ticket_code,
    status: row.status,
    attendanceStatus: row.attendance_status || (row.status === 'attended' ? 'present' : 'unmarked'),
    registrationDate: resolvedRegDate,
    registeredAt: resolvedRegDate,
    qrCodeData: row.qr_code_data,
    teamId: row.team_id,
    teamName: row.team_name,
    createdAt: row.created_at || resolvedRegDate,
    updatedAt: row.updated_at,
  };
};

export const mapAttendance = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    eventId: row.event_id,
    userId: row.student_id,
    studentId: row.student_id,
    registrationId: row.registration_id,
    ticketCode: row.ticket_code,
    attendedAt: row.checked_in_at || row.created_at,
    checkedInAt: row.checked_in_at || row.created_at,
    markedBy: row.verified_by,
    verifiedBy: row.verified_by,
    scanMethod: row.scan_method,
    createdAt: row.created_at,
  };
};

export const mapCertificate = (row) => {
  if (!row) return null;
  const certNumber = row.certificate_number || row.certificate_code || '';
  return {
    _id: row.id,
    id: row.id,
    certificateCode: certNumber,
    certificateNumber: certNumber,
    userId: row.student_id,
    studentId: row.student_id,
    eventId: row.event_id,
    studentName: row.student_name,
    studentRoll: row.student_roll || '',
    eventTitle: row.event_title,
    certificateTemplateUrl: row.certificate_template_url || row.event_template_url || '',
    certificateTemplateConfig:
      typeof (row.certificate_template_config || row.event_template_config) === 'string'
        ? JSON.parse(row.certificate_template_config || row.event_template_config)
        : (row.certificate_template_config || row.event_template_config || null),
    event: row.event_id ? {
      _id: row.event_id,
      id: row.event_id,
      title: row.event_title,
      category: row.event_category || 'Technical',
      eventDate: row.event_date ? (row.event_date.toISOString ? row.event_date.toISOString().split('T')[0] : String(row.event_date).split('T')[0]) : '',
      venue: row.event_venue || '',
      bannerImage: row.event_banner || '',
      certificateTemplateUrl: row.certificate_template_url || row.event_template_url || '',
      certificateTemplateConfig:
        typeof (row.certificate_template_config || row.event_template_config) === 'string'
          ? JSON.parse(row.certificate_template_config || row.event_template_config)
          : (row.certificate_template_config || row.event_template_config || null),
    } : null,
    eventDate: row.event_date ? (row.event_date.toISOString ? row.event_date.toISOString().split('T')[0] : String(row.event_date).split('T')[0]) : '',
    category: row.event_category || 'Technical',
    issuedAt: row.issue_date || row.created_at,
    issueDate: row.issue_date || row.created_at,
    issuedBy: row.issued_by,
    issuerOrganization: row.organization_name || 'College Event Council',
    pdfUrl: row.pdf_url || `/api/certificates/download/${certNumber}`,
    verificationUrl: row.verification_url || `/verify-certificate/${certNumber}`,
    status: 'valid',
    createdAt: row.created_at,
  };
};

export const mapAnnouncement = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    eventId: row.event_id,
    authorId: row.author_id,
    title: row.title,
    message: row.message,
    priority: row.priority || 'normal',
    createdAt: row.created_at,
  };
};

export const mapAuditLog = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    userId: row.user_id,
    adminEmail: row.admin_email,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    details: row.details,
    ipAddress: row.ip_address,
    createdAt: row.created_at,
  };
};

export const mapNotification = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    recipient: row.recipient_id,
    recipientId: row.recipient_id,
    title: row.title,
    message: row.message,
    type: row.type || 'general',
    link: row.link || '',
    isRead: !!row.is_read,
    createdAt: row.created_at,
  };
};

export const mapTeamMember = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    teamId: row.team_id,
    userId: row.user_id,
    role: row.role || 'Member',
    joinedAt: row.joined_at,
    user: row.user_name ? {
      id: row.user_id,
      _id: row.user_id,
      name: row.user_name,
      email: row.user_email,
      studentId: row.user_student_id,
      department: row.user_department,
      phone: row.user_phone,
      avatar: row.user_avatar,
    } : undefined,
  };
};

export const mapSubmission = (row) => {
  if (!row) return null;
  const fullName = row.user_name || row.submitter_name || row.full_name || 'Participant';
  const rollNumber = row.user_student_id || row.student_id || row.roll_number || '';
  const department = row.user_department || row.department || 'General';
  const email = row.user_email || row.submitter_email || row.email || '';
  const avatar = row.user_avatar || row.avatar || '';
  const phone = row.user_phone || row.phone || '';
  const timestamp = row.submitted_at || row.created_at || new Date().toISOString();

  const userObj = {
    id: row.student_user_id || row.user_id,
    _id: row.student_user_id || row.user_id,
    name: fullName,
    fullName,
    email,
    rollNumber,
    studentId: rollNumber,
    department,
    avatar,
    phone,
  };

  const roundObj = row.round_title ? {
    id: row.round_id,
    roundNumber: row.round_number ? Number(row.round_number) : 1,
    title: row.round_title,
    status: row.round_status || 'upcoming',
  } : (row.round_id ? { id: row.round_id } : null);

  const teamObj = row.team_name ? {
    id: row.team_id,
    name: row.team_name,
    teamName: row.team_name,
    inviteCode: row.team_invite_code || row.invite_code,
  } : null;

  return {
    id: row.id,
    _id: row.id,
    teamId: row.team_id,
    eventId: row.event_id,
    userId: row.user_id,
    roundId: row.round_id || null,
    roundNumber: row.round_number ? Number(row.round_number) : null,
    roundTitle: row.round_title || null,
    title: row.title,
    description: row.description || '',
    fileUrl: row.file_url || row.document_url || '',
    documentUrl: row.document_url || row.file_url || '',
    fileType: row.file_type || 'application/octet-stream',
    fileName: row.file_name || '',
    fileSize: Number(row.file_size) || 0,
    githubUrl: row.github_url || '',
    figmaUrl: row.figma_url || '',
    submittedAt: timestamp,
    createdAt: timestamp,
    updatedAt: row.updated_at || timestamp,
    teamName: row.team_name,
    submitterName: fullName,
    submitterEmail: email,
    fullName,
    rollNumber,
    studentId: rollNumber,
    department,
    email,
    avatar,
    phone,
    user: userObj,
    student: userObj,
    round: roundObj,
    team: teamObj,
    members: Array.isArray(row.members) ? row.members : (typeof row.members === 'string' ? JSON.parse(row.members) : undefined),
  };
};

export const mapEventRound = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    eventId: row.event_id,
    roundNumber: Number(row.round_number) || 1,
    title: row.title,
    description: row.description || '',
    deadline: row.deadline ? (row.deadline.toISOString ? row.deadline.toISOString() : String(row.deadline)) : null,
    status: row.status || 'upcoming',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const mapLFTPost = (row) => {
  if (!row) return null;
  const statusNormalized = (row.status || 'OPEN').toUpperCase();
  const contactInfoVal = row.contact_info || row.contact_preference || row.user_email || '';
  return {
    id: row.id,
    _id: row.id,
    userId: row.user_id,
    eventId: row.event_id,
    skills: Array.isArray(row.skills) ? row.skills : (typeof row.skills === 'string' ? JSON.parse(row.skills) : []),
    bio: row.bio || '',
    contactInfo: contactInfoVal,
    contactPreference: row.contact_preference || 'email',
    status: statusNormalized,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    user: row.user_name ? {
      id: row.user_id,
      _id: row.user_id,
      name: row.user_name,
      fullName: row.user_name,
      email: row.user_email,
      avatar: row.user_avatar || '',
      department: row.user_department || 'General',
      studentId: row.user_student_id || '',
      phone: row.user_phone || '',
    } : undefined,
    userName: row.user_name,
    candidateName: row.user_name,
    userEmail: row.user_email,
    candidateEmail: row.user_email,
    userAvatar: row.user_avatar || '',
    userDepartment: row.user_department || 'General',
  };
};

export const mapTeam = (row, members = [], submission = null) => {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    name: row.name,
    teamName: row.name,
    leaderId: row.leader_id,
    eventId: row.event_id,
    inviteCode: row.invite_code,
    leader: row.leader_name ? {
      id: row.leader_id,
      _id: row.leader_id,
      name: row.leader_name,
      email: row.leader_email,
      studentId: row.leader_student_id,
      department: row.leader_department,
      avatar: row.leader_avatar,
    } : undefined,
    members: Array.isArray(members) ? members.map(mapTeamMember) : [],
    memberCount: Array.isArray(members) ? members.length : 0,
    submission: submission ? mapSubmission(submission) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

