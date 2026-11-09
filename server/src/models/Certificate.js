import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema(
  {
    certificateCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
      trim: true,
    },
    certificateNumber: {
      type: String,
      index: true,
      uppercase: true,
      trim: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    eventId: {
      type: String,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userId: {
      type: String,
      index: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    eventTitle: {
      type: String,
      required: true,
    },
    eventDate: {
      type: Date,
      required: true,
    },
    category: {
      type: String,
      default: 'Technical',
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    pdfUrl: {
      type: String,
      default: '',
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    issuerOrganization: {
      type: String,
      default: 'College Event Board',
    },
    status: {
      type: String,
      enum: ['valid', 'revoked'],
      default: 'valid',
    },
  },
  {
    timestamps: true,
  }
);

certificateSchema.index({ event: 1, user: 1 }, { unique: true });

export const Certificate = mongoose.model('Certificate', certificateSchema);
