import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token to every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('campuspulse_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle unauthenticated responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const currentPath = window.location.pathname;
      // If we get 401 and not already on a login page, we can clear token
      if (
        !currentPath.includes('/login') &&
        !currentPath.includes('/register') &&
        currentPath !== '/'
      ) {
        localStorage.removeItem('campuspulse_token');
        localStorage.removeItem('campuspulse_user');
      }
    }
    return Promise.reject(error);
  }
);

/* ================= AUTH API ================= */
export const authService = {
  loginStudent: (credentials: { email: string; password: string }) =>
    api.post('/auth/student/login', credentials),

  loginOrganizer: (credentials: { email: string; password: string }) =>
    api.post('/auth/organizer/login', credentials),

  loginAdmin: (credentials: { email: string; password: string }) =>
    api.post('/auth/admin/login', credentials),

  registerStudent: (data: any) => api.post('/auth/student/register', data),

  registerOrganizer: (data: any) => api.post('/auth/organizer/register', data),

  getMe: () => api.get('/auth/me'),

  updateProfile: (data: any) => api.put('/auth/profile', data),

  changePassword: (data: any) => api.put('/auth/change-password', data),

  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
};

/* ================= USER / PROFILE API ================= */
export const userService = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data: any) => api.put('/user/profile', data),
};

/* ================= EVENT API ================= */
export const eventService = {
  getEvents: (params?: any) => api.get('/events', { params }),

  getPublicStats: () => api.get('/events/stats'),

  getEventById: (id: string) => api.get(`/events/${id}`),

  getTrendingEvents: () => api.get('/events/trending'),

  getRecommendedEvents: () => api.get('/events/recommendations'),

  getCalendarEvents: (params?: any) => api.get('/events/calendar', { params }),

  getMyOrganizedEvents: () => api.get('/events/my-organized'),

  createEvent: (data: any) => api.post('/events', data),

  updateEvent: (id: string, data: any) => api.put(`/events/${id}`, data),

  cancelEvent: (id: string, reason: string) => api.put(`/events/${id}/cancel`, { reason }),
};

/* ================= REGISTRATION API ================= */
export const registrationService = {
  registerForEvent: (eventId: string, bypassConflict: boolean = false) =>
    api.post(`/registrations/register/${eventId}`, { bypassConflict }),

  registerTeam: (eventId: string, teamName: string) =>
    api.post(`/registrations/team/${eventId}`, { teamName }),

  joinTeam: (eventId: string, joinCode: string) =>
    api.post(`/registrations/join-team/${eventId}`, { joinCode }),

  cancelRegistration: (registrationId: string) =>
    api.put(`/registrations/${registrationId}/cancel`),

  getMyRegistrations: (status?: string) =>
    api.get('/registrations/my', { params: { status } }),

  getEventParticipants: (eventId: string, params?: any) =>
    api.get(`/registrations/event/${eventId}`, { params }),

  getEventRegistrations: (eventId: string, params?: any) =>
    api.get(`/organizer/events/${eventId}/registrations`, { params }),

  exportParticipantsCSV: (eventId: string) =>
    api.get(`/registrations/event/${eventId}/export-csv`, { responseType: 'blob' }),
};

/* ================= ATTENDANCE API ================= */
export const attendanceService = {
  verifyAndMarkAttendance: (ticketCode: string, eventId?: string) =>
    api.post('/attendance/verify', { ticketCode, eventId }),

  markAttendance: (payload: {
    ticketCode?: string;
    passCode?: string;
    eventId?: string;
    registrationId?: string;
    studentId?: string;
    method?: string;
  }) => api.post('/organizer/mark-attendance', payload),

  getPassDetails: (passCode: string) =>
    api.get(`/organizer/verify-pass/${encodeURIComponent(passCode)}`),

  getEventAttendanceStats: (eventId: string) => api.get(`/attendance/stats/${eventId}`),
};

/* ================= CERTIFICATE API ================= */
export const certificateService = {
  getMyCertificates: () => api.get('/certificates/my'),

  getEventCertificate: (eventId: string) => api.get(`/certificates/event/${eventId}`),

  issueCertificatesForEvent: (eventId: string) => api.post(`/certificates/issue/${eventId}`),

  verifyCertificate: (code: string) => api.get(`/certificates/verify/${code}`),

  downloadCertificateUrl: (code: string) => `${api.defaults.baseURL || '/api'}/certificates/download/${code}`,
};

/* ================= ADMIN API ================= */
export const adminService = {
  getStats: () => api.get('/admin/stats'),

  // Event Management (CRUD & Lifecycle)
  getAllEvents: (params?: any) => api.get('/admin/events', { params }),

  createEvent: (data: any) => api.post('/admin/events', data),

  updateEvent: (eventId: string, data: any) => api.put(`/admin/events/${eventId}`, data),

  updateEventStatus: (eventId: string, status: string) =>
    api.put(`/admin/events/${eventId}/status`, { status }),

  deleteEvent: (eventId: string) => api.delete(`/admin/events/${eventId}`),

  // Event Attendance & CSV Export
  getEventAttendance: (eventId: string, params?: any) =>
    api.get(`/admin/events/${eventId}/attendance`, { params }),

  updateAttendanceStatus: (eventId: string, registrationId: string, status: string) =>
    api.put(`/admin/events/${eventId}/attendance/${registrationId}`, { status }),

  exportAttendanceCSV: (eventId: string) =>
    api.get(`/admin/events/${eventId}/attendance/export-csv`, { responseType: 'blob' }),

  getPendingEvents: () => api.get('/admin/events/pending'),

  approveEvent: (eventId: string) => api.put(`/admin/events/${eventId}/approve`),

  rejectEvent: (eventId: string, reason: string) =>
    api.put(`/admin/events/${eventId}/reject`, { reason }),

  getAllUsers: (params?: any) => api.get('/admin/users', { params }),

  toggleUserStatus: (userId: string) => api.put(`/admin/users/${userId}/toggle-status`),

  updateUserRole: (userId: string, role: string) =>
    api.put(`/admin/users/${userId}/role`, { role }),

  createAdminAccount: (data: any) => api.post('/admin/users/create-admin', data),

  getAuditLogs: (params?: any) => api.get('/admin/audit-logs', { params }),

  getAllRegistrations: (params?: any) => api.get('/admin/registrations', { params }),
};

/* ================= ANNOUNCEMENT & NOTIFICATION API ================= */
export const announcementService = {
  getAnnouncements: (params?: any) => api.get('/announcements', { params }),

  createAnnouncement: (data: any) => api.post('/announcements', data),
};

export const notificationService = {
  getMyNotifications: () => api.get('/notifications'),

  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),

  markAllAsRead: () => api.put('/notifications/read-all'),
};

/* ================= TEAM & SUBMISSION API ================= */
export const teamService = {
  createTeam: (eventId: string, data: { name: string; invites?: string[] }) =>
    api.post(`/events/${eventId}/teams`, data),

  joinTeam: (eventId: string, inviteCode: string) =>
    api.post(`/events/${eventId}/teams/join`, { inviteCode }),

  getMyTeam: (eventId: string) =>
    api.get(`/events/${eventId}/teams/my-team`),

  getEventTeams: (eventId: string) =>
    api.get(`/events/${eventId}/teams`),

  inviteMember: (eventId: string, data: { emailOrStudentId: string }) =>
    api.post(`/events/${eventId}/teams/invite`, data),

  removeMember: (eventId: string, memberId: string) =>
    api.delete(`/events/${eventId}/teams/members/${memberId}`),
};

export const submissionService = {
  submitDeliverable: (
    eventId: string,
    data: {
      title: string;
      description?: string;
      fileUrl: string;
      fileName?: string;
      fileType: string;
      fileSize?: number;
      githubUrl?: string;
      figmaUrl?: string;
      roundId?: string | null;
    }
  ) => api.post(`/events/${eventId}/submit`, data),

  getMySubmission: (eventId: string, roundId?: string) =>
    api.get(`/events/${eventId}/my-submission`, { params: { roundId } }),

  getEventSubmissions: (eventId: string) =>
    api.get(`/events/${eventId}/submissions`),
};

/* ================= LFT (LOOKING FOR TEAM) API ================= */
export const lftService = {
  getEventLFTPosts: (eventId: string) => api.get(`/events/${eventId}/lft`),

  createOrUpdateLFTPost: (
    eventId: string,
    data: {
      skills: string[];
      bio?: string;
      contactInfo?: string;
      contactPreference?: string;
      status?: string;
    }
  ) => api.post(`/events/${eventId}/lft`, data),

  deleteLFTPost: (eventId: string, lftId?: string, action?: string) =>
    api.delete(`/events/${eventId}/lft${lftId ? `/${lftId}` : ''}`, {
      params: action ? { action } : undefined,
      data: action ? { action } : undefined,
    }),

  inviteLFTParticipant: (eventId: string, lftId: string) =>
    api.post(`/events/${eventId}/lft/${lftId}/invite`),
};

/* ================= MULTI-ROUND EVENT STAGES API ================= */
export const roundService = {
  getEventRounds: (eventId: string) => api.get(`/events/${eventId}/rounds`),

  configureEventRounds: (eventId: string, rounds: any[]) =>
    api.post(`/events/${eventId}/rounds`, { rounds }),

  updateEventRound: (eventId: string, roundId: string, data: any) =>
    api.put(`/events/${eventId}/rounds/${roundId}`, data),

  deleteEventRound: (eventId: string, roundId: string) =>
    api.delete(`/events/${eventId}/rounds/${roundId}`),
};

export default api;
