export type UserRole = 'student' | 'organizer' | 'admin';

export interface User {
  _id: string;
  id?: string;
  name: string;
  fullName?: string;
  email: string;
  username?: string;
  role: UserRole;
  studentId?: string;
  rollNumber?: string;
  employeeId?: string;
  adminId?: string;
  department?: string;
  graduationYear?: number;
  phone?: string;
  avatar?: string;
  avatarUrl?: string;
  profilePicture?: string;
  bio?: string;
  interests?: string[];
  organizationName?: string;
  isActive: boolean;
  createdAt: string;
}

export type EventCategory =
  | 'Technical'
  | 'Hackathon'
  | 'Workshop'
  | 'Seminar'
  | 'Cultural'
  | 'Sports'
  | 'Conference'
  | 'Webinar';

export type EventStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'completed';

export type EventLifecycleStatus = 'Upcoming' | 'Ongoing' | 'Completed';

export interface CertificateCoordinate {
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
}

export interface CertificateTemplateConfig {
  studentName?: CertificateCoordinate;
  studentRoll?: CertificateCoordinate;
  eventTitle?: CertificateCoordinate;
  issueDate?: CertificateCoordinate;
  certificateId?: CertificateCoordinate;
  textColor?: string;
  accentColor?: string;
}

export interface CollegeEvent {
  _id: string;
  id?: string;
  title: string;
  description: string;
  category: EventCategory;
  bannerImage: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  startDate?: string;
  endDate?: string;
  eventStatus?: EventLifecycleStatus | string;
  venue: string;
  venueType: 'offline' | 'online' | 'hybrid';
  meetingUrl?: string;
  organizer?: User | string;
  organizerName?: string;
  organizerContact?: string;
  department?: string;
  maxCapacity: number;
  registeredCount: number;
  waitlistCount?: number;
  availableSeats?: number;
  isRegistrationOpen?: boolean;
  registrationDeadline: string;
  isPaid: boolean;
  ticketPrice: number;
  eligibility: string;
  prerequisites?: string;
  isTeamEvent: boolean;
  teamMinSize?: number;
  teamMaxSize?: number;
  maxTeamSize?: number;
  certificateTemplateUrl?: string;
  certificateTemplateConfig?: CertificateTemplateConfig | null;
  status: EventStatus;
  rejectionReason?: string;
  tags: string[];
  views: number;
  featured: boolean;
  ratingAverage?: number;
  ratingCount?: number;
  createdAt: string;
}

export type RegistrationStatus = 'registered' | 'confirmed' | 'waitlisted' | 'attended' | 'cancelled';

export interface Registration {
  _id: string;
  id?: string;
  event: CollegeEvent;
  user: User;
  ticketCode: string;
  registrationType?: 'individual' | 'team';
  teamName?: string;
  team?: {
    _id: string;
    teamName: string;
    joinCode: string;
  };
  status: RegistrationStatus;
  attendanceStatus?: 'present' | 'absent' | 'unmarked' | string;
  isPresent?: boolean;
  fullName?: string;
  rollNumber?: string;
  studentId?: string;
  department?: string;
  email?: string;
  avatar?: string;
  phone?: string;
  scanMethod?: string;
  qrCodeData: string;
  registeredAt?: string;
  registrationDate?: string;
  createdAt?: string;
  attendedAt?: string;
  certificateIssued?: boolean;
  certificate?: string | Certificate;
  feedbackRating?: number;
  feedbackComment?: string;
}

export interface Certificate {
  _id: string;
  id?: string;
  certificateCode: string;
  certificateNumber?: string;
  userId?: string;
  eventId?: string;
  studentId?: string;
  event: CollegeEvent | string;
  user: User | string;
  studentName: string;
  studentRoll?: string;
  eventTitle: string;
  eventDate: string;
  category: string;
  issueDate: string;
  issuedAt?: string;
  issuedBy?: User | string;
  issuerOrganization: string;
  pdfUrl?: string;
  verificationUrl?: string;
  certificateTemplateUrl?: string;
  certificateTemplateConfig?: CertificateTemplateConfig | null;
  status: 'valid' | 'revoked';
  createdAt?: string;
}

export interface Attendance {
  _id?: string;
  id: string;
  eventId: string;
  userId: string;
  studentId?: string;
  registrationId?: string;
  ticketCode?: string;
  attendedAt: string;
  checkedInAt?: string;
  markedBy: string;
  verifiedBy?: string;
  scanMethod?: string;
  createdAt?: string;
}

export interface Announcement {
  _id: string;
  title: string;
  content: string;
  author: User;
  authorName: string;
  authorRole: string;
  event?: string | CollegeEvent;
  eventTitle?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  targetAudience: 'all' | 'students' | 'organizers' | 'registered_participants';
  isPinned: boolean;
  createdAt: string;
}

export interface AppNotification {
  _id: string;
  recipient: string;
  title: string;
  message: string;
  type: 'event_approval' | 'event_update' | 'registration' | 'cancellation' | 'announcement' | 'certificate' | 'system';
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogItem {
  _id: string;
  admin: User | string;
  adminName: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId?: string;
  targetName?: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

export interface AdminStats {
  users: {
    students: number;
    organizers: number;
    admins: number;
    total: number;
  };
  events: {
    total: number;
    pending: number;
    approved: number;
    cancelled: number;
  };
  participation: {
    totalRegistrations: number;
    totalAttended: number;
    attendanceRate: number;
  };
  categoryStats: { category: string; count: number; totalRegistrations: number }[];
  monthlyRegistrations: { month: string; registrations: number; attended: number }[];
  recentLogs: AuditLogItem[];
}

export interface TeamMember {
  id: string;
  _id?: string;
  teamId: string;
  userId: string;
  role: 'Leader' | 'Member';
  joinedAt: string;
  user?: Partial<User>;
}

export interface Submission {
  id: string;
  _id?: string;
  teamId?: string;
  eventId: string;
  userId?: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  fileName?: string;
  fileSize?: number;
  githubUrl?: string;
  figmaUrl?: string;
  submittedAt: string;
  updatedAt?: string;
  teamName?: string;
  submitterName?: string;
}

export interface Team {
  id: string;
  _id?: string;
  name: string;
  teamName?: string;
  leaderId: string;
  leaderName?: string;
  eventId: string;
  inviteCode: string;
  createdAt: string;
  updatedAt?: string;
  leader?: Partial<User>;
  members?: TeamMember[];
  memberCount?: number;
  submission?: Submission | null;
  hasSubmission?: boolean;
}

