import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

// Route imports
import authRoutes from './routes/authRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import registrationRoutes from './routes/registrationRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import lftRoutes from './routes/lftRoutes.js';
import roundRoutes from './routes/roundRoutes.js';
import { protect, requireAnyRole } from './middleware/auth.js';
import { updateProfile, getMe } from './controllers/authController.js';
import { markAttendance, getPassDetails } from './controllers/attendanceController.js';
import { getEventRegistrations, exportParticipantsCSV } from './controllers/registrationController.js';
import { getOrganizerEventSubmissions, exportSubmissionsCSV } from './controllers/submissionController.js';

dotenv.config();

const app = express();

// Security and utility middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow local development, same origin, and vercel preview domains
      callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Serve local public uploads (for stored deliverables & certificates)
app.use('/uploads', express.static(path.resolve(process.cwd(), 'server', 'public', 'uploads')));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

import { getSafeDatabaseInfo } from './config/db.js';

// Health check endpoint with real-time Neon PostgreSQL diagnostics
app.get(['/api/health', '/health'], async (req, res) => {
  try {
    const dbInfo = await getSafeDatabaseInfo();
    const status = dbInfo.connected ? 'healthy' : 'degraded';
    res.status(200).json({
      status,
      timestamp: new Date().toISOString(),
      service: 'SGU Field Project | College Event Management System API',
      database: dbInfo,
    });
  } catch (err) {
    res.status(200).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      service: 'SGU Field Project | College Event Management System API',
      error: err.message,
    });
  }
});

// Mount application API routes (supporting both /api/* and stripped /* paths)
app.use(['/api/user/profile', '/user/profile', '/api/users/profile', '/users/profile'], (req, res, next) => {
  if (req.method === 'PUT' || req.method === 'PATCH') {
    return protect(req, res, () => updateProfile(req, res, next));
  }
  if (req.method === 'GET') {
    return protect(req, res, () => getMe(req, res, next));
  }
  next();
});
app.post(
  ['/api/organizer/mark-attendance', '/organizer/mark-attendance', '/api/organizer/attendance', '/organizer/attendance'],
  protect,
  requireAnyRole(['organizer', 'admin']),
  markAttendance
);
app.get(
  [
    '/api/organizer/verify-pass/:passCode',
    '/organizer/verify-pass/:passCode',
    '/api/organizer/verify-pass',
    '/organizer/verify-pass',
    '/api/verify-pass/:passCode',
    '/verify-pass/:passCode',
  ],
  protect,
  requireAnyRole(['organizer', 'admin']),
  getPassDetails
);
app.get(
  [
    '/api/organizer/events/:id/registrations',
    '/organizer/events/:id/registrations',
    '/api/organizer/events/:eventId/registrations',
    '/organizer/events/:eventId/registrations',
  ],
  protect,
  requireAnyRole(['organizer', 'admin']),
  getEventRegistrations
);
app.get(
  [
    '/api/organizer/events/:id/export-csv',
    '/organizer/events/:id/export-csv',
    '/api/organizer/events/:eventId/export-csv',
    '/organizer/events/:eventId/export-csv',
  ],
  protect,
  requireAnyRole(['organizer', 'admin']),
  exportParticipantsCSV
);
app.get(
  [
    '/api/organizer/events/:id/submissions',
    '/organizer/events/:id/submissions',
    '/api/organizer/events/:eventId/submissions',
    '/organizer/events/:eventId/submissions',
  ],
  protect,
  requireAnyRole(['organizer', 'admin']),
  getOrganizerEventSubmissions
);
app.get(
  [
    '/api/organizer/events/:id/submissions/export-csv',
    '/organizer/events/:id/submissions/export-csv',
    '/api/organizer/events/:eventId/submissions/export-csv',
    '/organizer/events/:eventId/submissions/export-csv',
  ],
  protect,
  requireAnyRole(['organizer', 'admin']),
  exportSubmissionsCSV
);
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/events', '/events'], eventRoutes);
app.use(['/api/registrations', '/registrations'], registrationRoutes);
app.use(['/api/attendance', '/attendance'], attendanceRoutes);
app.use(['/api/certificates', '/certificates'], certificateRoutes);
app.use(['/api/admin', '/admin'], adminRoutes);
app.use(['/api/announcements', '/announcements'], announcementRoutes);
app.use(['/api/notifications', '/notifications'], notificationRoutes);
app.use(['/api/teams', '/teams'], teamRoutes);
app.use(['/api/submissions', '/submissions'], submissionRoutes);
app.use(['/api/deliverables', '/deliverables'], submissionRoutes);
app.use(['/api/lft', '/lft'], lftRoutes);
app.use(['/api/rounds', '/rounds'], roundRoutes);

// 404 Handler for undefined API routes
app.use(['/api/*', '/api'], (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

export default app;
