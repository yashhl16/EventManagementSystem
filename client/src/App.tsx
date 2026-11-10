import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts & Guard
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { StudentLayout } from './components/layout/StudentLayout';
import { OrganizerLayout } from './components/layout/OrganizerLayout';
import { AdminLayout } from './components/layout/AdminLayout';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { ExploreEventsPage } from './pages/public/ExploreEventsPage';
import { EventDetailsPage } from './pages/public/EventDetailsPage';
import { ProjectShowcasePage } from './pages/public/ProjectShowcasePage';
import { VerifyCertificatePage } from './pages/public/VerifyCertificatePage';
import { NotFoundPage } from './pages/public/NotFoundPage';

// Auth Pages
import { StudentLoginPage } from './pages/auth/StudentLoginPage';
import { StudentRegisterPage } from './pages/auth/StudentRegisterPage';
import { OrganizerLoginPage } from './pages/auth/OrganizerLoginPage';
import { OrganizerRegisterPage } from './pages/auth/OrganizerRegisterPage';
import { AdminLoginPage } from './pages/auth/AdminLoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { MyRegistrationsPage } from './pages/student/MyRegistrationsPage';
import { StudentCalendarPage } from './pages/student/StudentCalendarPage';
import { MyCertificatesPage } from './pages/student/MyCertificatesPage';
import { StudentProfilePage } from './pages/student/StudentProfilePage';

// Organizer Pages
import { OrganizerDashboard } from './pages/organizer/OrganizerDashboard';
import { CreateEventPage } from './pages/organizer/CreateEventPage';
import { EditEventPage } from './pages/organizer/EditEventPage';
import { ManageEventRegistrationsPage } from './pages/organizer/ManageEventRegistrationsPage';
import { QRScanAttendancePage } from './pages/organizer/QRScanAttendancePage';
import { OrganizerScanPassPage } from './pages/organizer/OrganizerScanPassPage';
import { OrganizerAnnouncementsPage } from './pages/organizer/OrganizerAnnouncementsPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminEventsPage } from './pages/admin/AdminEventsPage';
import { AdminEventApprovalsPage } from './pages/admin/AdminEventApprovalsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/events" element={<ExploreEventsPage />} />
      <Route path="/events/:id" element={<EventDetailsPage />} />
      <Route path="/events/:id/showcase" element={<ProjectShowcasePage />} />
      <Route path="/events/:id/gallery" element={<ProjectShowcasePage />} />
      <Route path="/calendar" element={<StudentCalendarPage />} />
      <Route path="/verify-certificate" element={<VerifyCertificatePage />} />
      <Route path="/verify-certificate/:code" element={<VerifyCertificatePage />} />
      <Route path="/verify-certificate/:id" element={<VerifyCertificatePage />} />
      <Route path="/verify/:code" element={<VerifyCertificatePage />} />

      {/* Authentication Portals */}
      <Route path="/student/login" element={<StudentLoginPage />} />
      <Route path="/login" element={<StudentLoginPage />} />
      <Route path="/student/register" element={<StudentRegisterPage />} />

      <Route path="/organizer/login" element={<OrganizerLoginPage />} />
      <Route path="/organizer/register" element={<OrganizerRegisterPage />} />

      {/* Dedicated Administrator Portal */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Student Protected Portal */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['student', 'organizer', 'admin']}>
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/my-events" element={<MyRegistrationsPage />} />
        <Route path="/certificates" element={<MyCertificatesPage />} />
        <Route path="/profile" element={<StudentProfilePage />} />
      </Route>

      {/* Organizer Protected Portal */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['organizer', 'admin']}>
            <OrganizerLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
        <Route path="/organizer/create-event" element={<CreateEventPage />} />
        <Route path="/organizer/edit-event/:id" element={<EditEventPage />} />
        <Route path="/organizer/events/:id" element={<ManageEventRegistrationsPage />} />
        <Route path="/organizer/events/:id/roster" element={<ManageEventRegistrationsPage />} />
        <Route path="/organizer/events/:id/registrations" element={<ManageEventRegistrationsPage />} />
        <Route path="/organizer/attendance-scanner" element={<QRScanAttendancePage />} />
        <Route path="/organizer/scan" element={<OrganizerScanPassPage />} />
        <Route path="/organizer/announcements" element={<OrganizerAnnouncementsPage />} />
        <Route path="/organizer/profile" element={<StudentProfilePage />} />
      </Route>

      {/* Administrator Protected Portal */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/events" element={<AdminEventsPage />} />
        <Route path="/admin/events/:id/registrations" element={<ManageEventRegistrationsPage />} />
        <Route path="/admin/events/:id/roster" element={<ManageEventRegistrationsPage />} />
        <Route path="/admin/approvals" element={<AdminEventApprovalsPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
        <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
        <Route path="/admin/profile" element={<StudentProfilePage />} />
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
