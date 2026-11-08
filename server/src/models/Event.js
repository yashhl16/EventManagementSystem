import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide an event title'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide an event description'],
    },
    category: {
      type: String,
      required: [true, 'Please specify an event category'],
      enum: [
        'Technical',
        'Hackathon',
        'Workshop',
        'Seminar',
        'Cultural',
        'Sports',
        'Conference',
        'Webinar',
      ],
      index: true,
    },
    bannerImage: {
      type: String,
      default: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1200',
    },
    eventDate: {
      type: Date,
      required: [true, 'Please provide an event date'],
      index: true,
    },
    startTime: {
      type: String,
      required: [true, 'Please provide a start time (e.g. 09:30 AM)'],
    },
    endTime: {
      type: String,
      required: [true, 'Please provide an end time (e.g. 04:30 PM)'],
    },
    venue: {
      type: String,
      required: [true, 'Please provide a venue or platform link'],
    },
    venueType: {
      type: String,
      enum: ['offline', 'online', 'hybrid'],
      default: 'offline',
    },
    meetingUrl: {
      type: String,
      default: '',
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizerName: {
      type: String,
      default: '',
    },
    organizerContact: {
      type: String,
      default: '',
    },
    maxCapacity: {
      type: Number,
      required: [true, 'Please specify maximum capacity'],
      min: [1, 'Capacity must be at least 1'],
    },
    registeredCount: {
      type: Number,
      default: 0,
    },
    waitlistCount: {
      type: Number,
      default: 0,
    },
    registrationDeadline: {
      type: Date,
      required: [true, 'Please provide a registration deadline'],
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    ticketPrice: {
      type: Number,
      default: 0,
    },
    eligibility: {
      type: String,
      default: 'Open to all college students',
    },
    prerequisites: {
      type: String,
      default: 'None',
    },
    isTeamEvent: {
      type: Boolean,
      default: false,
    },
    teamMinSize: {
      type: Number,
      default: 1,
    },
    teamMaxSize: {
      type: Number,
      default: 4,
    },
    maxTeamSize: {
      type: Number,
      default: 4,
    },
    status: {
      type: String,
      enum: ['pending_approval', 'approved', 'rejected', 'cancelled', 'completed'],
      default: 'pending_approval',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    ratingAverage: {
      type: Number,
      default: 4.8,
      min: 1,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for remaining seats
eventSchema.virtual('availableSeats').get(function () {
  return Math.max(0, this.maxCapacity - this.registeredCount);
});

// Virtual for isRegistrationOpen
eventSchema.virtual('isRegistrationOpen').get(function () {
  const now = new Date();
  const deadlinePassed = this.registrationDeadline && new Date(this.registrationDeadline) < now;
  const isApproved = this.status === 'approved';
  return isApproved && !deadlinePassed;
});

eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

export const Event = mongoose.model('Event', eventSchema);
