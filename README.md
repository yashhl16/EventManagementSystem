# SGU Field Project | Modern College Event Management & Campus Activity Platform

A modern, responsive, full-stack **College Event Management System** designed for Sanjay Ghodawat University (SGU). SGU Field Project bridges students, student club coordinators, faculty event organizers, and central college administrators into a unified, secure campus platform.

---

## Key Highlights & Standout Features

- **Dedicated Role Portals & Strict Access Control**:
  - **Student Portal** (`/student/login` & `/student/register`): Browse activities, one-click registration, interactive calendar, live digital QR entry passes, conflict alerts, and verifiable certificate downloads.
  - **Organizer Studio** (`/organizer/login` & `/organizer/register`): Submit event proposals, view live rosters, export CSV attendee records, broadcast announcements, scan QR entry passes, and issue verified certificates.
  - **Administrator Core** (`/admin/login`): High-security institutional portal strictly restricted to verified administrators. Rejects student and organizer logins, manages event approval workflows, oversees user privileges, analyzes participation analytics, and maintains immutable audit logs.
- **AI-Based Event Recommendations**: Rule-based algorithm matching student interest tags, degree majors, and engagement history against event categories and metadata to calculate personalized match scores.
- **Schedule Conflict Detector**: Automatically warns students when attempting to register for events overlapping in calendar day and session time.
- **QR-Code Digital Entry Passes**: Instant QR codes generated upon registration, compatible with smartphone screen scanning at venue check-in desks.
- **Attendance-Linked Verifiable Certificates**: Certificates of Participation issued to verified attendees with unique verification codes (`CERT-YYYY-XXXX-XXXX`) and public authentication at `/verify/:code`.
- **Zero-Config Resilient Database**: Connects to persistent MongoDB if configured via `MONGO_URI`. If no local MongoDB daemon is running, it automatically boots an embedded MongoDB memory server pre-loaded with realistic college events and accounts.

---

## System Architecture

```
CampusPulse
├── client/                     # Frontend Application (React 18 + TypeScript + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/         # Reusable UI widgets (EventCard, TicketPassModal, QRScannerModal, etc.)
│   │   ├── context/            # AuthContext, ThemeContext, NotificationContext
│   │   ├── pages/
│   │   │   ├── auth/           # Dedicated portals: AdminLogin, StudentLogin, OrganizerLogin
│   │   │   ├── student/        # StudentDashboard, MyRegistrations, StudentCalendar, Certificates
│   │   │   ├── organizer/      # OrganizerDashboard, CreateEvent, ManageRoster, QRScanner
│   │   │   ├── admin/          # AdminDashboard, Approvals, Users, Analytics, AuditLogs
│   │   │   └── public/         # LandingPage, ExploreEvents, EventDetails, VerifyCertificate
│   │   ├── services/           # Central Axios client with JWT interceptors
│   │   └── types/              # TypeScript interfaces
├── server/                     # Backend API (Node.js + Express.js + Mongoose)
│   ├── src/
│   │   ├── config/             # Database connection with fallback & comprehensive seeder
│   │   ├── controllers/        # Controllers for Auth, Events, Registrations, Attendance, etc.
│   │   ├── middleware/         # JWT verification, Role-based access control, Rate limiters
│   │   ├── models/             # Mongoose schemas (User, Event, Registration, Attendance, Cert, Audit)
│   │   ├── routes/             # REST API endpoints
│   │   └── utils/              # QR generator, AI recommender, conflict detector
```

---

## Pre-Configured Demo Credentials

The platform is pre-seeded with realistic data across all three personas:

| Persona | Login Portal | Email | Password | Role Privileges |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `/admin/login` | `admin@college.edu` | `Admin@12345` | Institutional governance, event moderation, user privileges, analytics, audit logs |
| **Faculty Organizer** | `/organizer/login` | `organizer@college.edu` | `Organizer@12345` | ACM Chapter advisor, creates events, manages rosters, scans QR passes, issues certificates |
| **Student** | `/student/login` | `student@college.edu` | `Student@12345` | Undergrad CS student, registers for events, views QR passes, earns certificates |

> [!NOTE]
> All login pages feature an **Auto Fill** button for instant one-click credential population during testing.

---

## Environment Configuration

A template `.env.example` is provided in the root directory.

```bash
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database configuration: Leave blank or set custom URI.
# If MONGO_URI is omitted or unreachable, CampusPulse will automatically
# boot an in-memory database with pre-seeded college events.
MONGO_URI=mongodb://127.0.0.1:27017/college_events

# Security & Authentication
JWT_SECRET=super_secret_college_event_hub_jwt_key_2026_secured
JWT_EXPIRES_IN=7d

# Initial Super Administrator
ADMIN_NAME="Chief Campus Administrator"
ADMIN_EMAIL=admin@college.edu
ADMIN_PASSWORD=Admin@12345
ADMIN_ID=ADM-2026-001
```

---

## Installation & Running Locally

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **NPM**: v9.0.0 or higher
- Optional: MongoDB running locally on port 27017 (or use embedded memory fallback automatically)

### 1. Install Dependencies
In the root directory (or run separately in `client/` and `server/`):
```bash
# In server directory:
cd server
npm install

# In client directory:
cd ../client
npm install
```

### 2. Launch the Application
You can run both backend and frontend concurrently:
```bash
# Terminal 1: Start Backend API (Port 5000)
cd server
npm run dev

# Terminal 2: Start Frontend Client (Port 5173)
cd client
npm run dev
```

### 3. Open in Browser
- **Public Portal**: [http://localhost:5173](http://localhost:5173)
- **Student Sign In**: [http://localhost:5173/student/login](http://localhost:5173/student/login)
- **Organizer Studio**: [http://localhost:5173/organizer/login](http://localhost:5173/organizer/login)
- **Administration Portal**: [http://localhost:5173/admin/login](http://localhost:5173/admin/login)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## Automated Verification Suite

Run the automated test suite to verify role protections, token handling, registration rules, and certificate validation:
```bash
cd server
node test-flows.js
```

---

## Deployment to Vercel

CampusPulse includes a production-ready `vercel.json` configuration at the repository root with Vite framework detection, automated client build commands, and single-page application (SPA) client-side routing rewrites.

### Option A: Connect via Vercel Web Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/new).
2. Click **Add New Project** and select **Import Git Repository**.
3. Choose the repository: `yashhl16/EventManagementSystem`.
4. Configure Project Settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm --prefix client run build` (auto-detected from `vercel.json`)
   - **Output Directory**: `client/dist` (auto-detected from `vercel.json`)
5. **Environment Variables**:
   - `VITE_API_URL`: URL of your deployed backend API (e.g., `https://your-backend-api.onrender.com/api` or `https://api.yourdomain.com/api`).
     *(If deploying full-stack or proxying, leave blank or point to your production API).*
6. Click **Deploy**. Vercel will build and serve your production application with automatic SSL and global CDN distribution.

### Option B: Deploy via Vercel CLI

In your terminal:
```bash
# 1. Log in to Vercel
npx vercel login

# 2. Deploy to Production
npx vercel --prod
```

---

## Automated Secondary Database Backup (Neon PostgreSQL)

CampusPulse includes a GitHub Actions workflow at `.github/workflows/neon-db-backup.yml` that replicates the primary Neon PostgreSQL database (`DATABASE_URL`) into a dedicated secondary Neon backup project (`NEON_BACKUP_DATABASE_URL`) every day at `00:00 UTC` (with manual execution support via `workflow_dispatch`).

### Pipeline Behavior

- Runs `pg_dump --clean --if-exists --no-owner --no-privileges` against `DATABASE_URL` with SSL (`sslmode=require`).
- Automatically installs a matching `postgresql-client` major version if the Neon database runs a newer PostgreSQL release than the Ubuntu runner default.
- Streams schema, constraints, relations, data, and sequence states directly into `NEON_BACKUP_DATABASE_URL` inside a single atomic transaction (`psql --single-transaction -v ON_ERROR_STOP=1`).
- Verifies that public tables, foreign key constraint counts, sequence values, and per-table row counts match between both Neon projects.

### Option 1: One-Command Automated Setup (Recommended)

Use [scripts/setup-neon-backup.js](scripts/setup-neon-backup.js) to automatically provision a secondary Neon project named `event-system-backup-secondary`, retrieve its direct (non-pooled) connection string, and upload `NEON_BACKUP_DATABASE_URL` to GitHub repository secrets via the GitHub CLI (`gh`) or GitHub REST API (`libsodium-wrappers` sealed-box encryption).

1. Install root dependencies once (required if using GitHub REST API fallback without `gh` CLI):
   ```bash
   npm install
   ```
2. Provide your **Neon API Key** (Neon Console -> Account Settings -> API Keys) and **GitHub Token** (`repo` / Actions secrets write permission — optional if `gh` CLI is already logged in) and run in a single command:

   **macOS / Linux (Bash):**
   ```bash
   NEON_API_KEY="neon_api_key_here" GITHUB_TOKEN="github_pat_here" node scripts/setup-neon-backup.js
   ```

   **Windows (PowerShell):**
   ```powershell
   $env:NEON_API_KEY="neon_api_key_here"; $env:GITHUB_TOKEN="github_pat_here"; node scripts/setup-neon-backup.js
   ```

   *Optional flags:*
   - `--dry-run` — Preview actions without provisioning a Neon project or modifying GitHub secrets.
   - `--include-primary` — Also push your local `DATABASE_URL` environment variable to GitHub secret `DATABASE_URL`.
   - `--region=<region_id>` / `--pg-version=<16|17>` / `--org-id=<neon_org_id>` — Customize Neon project provisioning options.

### Option 2: Manual Setup Repository Secrets

1. Create a **separate secondary Neon project** in the [Neon Console](https://console.neon.tech/) to store automated database backups.
2. Copy its PostgreSQL connection string with SSL enabled (`?sslmode=require`; using a direct non-pooled Neon endpoint is recommended for `pg_dump`/`psql` operations).
3. In your GitHub repository, navigate to **Settings -> Secrets and variables -> Actions -> New repository secret** and configure:
   - `DATABASE_URL`: Primary production Neon PostgreSQL connection string (`postgres://...?sslmode=require`).
   - `NEON_BACKUP_DATABASE_URL`: Secondary backup Neon PostgreSQL connection string (`postgres://...?sslmode=require`).

### Manual Sync & Verification

1. Open the **Actions** tab in GitHub and select **Neon Secondary Database Backup**.
2. Click **Run workflow** to trigger an immediate replication run via `workflow_dispatch`.
3. Inspect the workflow logs to confirm clean `pg_dump` / `psql` completion and matching table, foreign key, row count, and sequence verification output.

---

## License

CampusPulse is developed for higher education institutions and university campus councils.

