import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a team name'],
      trim: true,
      maxlength: [100, 'Team name cannot exceed 100 characters'],
    },
    teamName: {
      type: String,
      trim: true,
    },
    leaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    leader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
    },
    inviteCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    joinCode: {
      type: String,
      uppercase: true,
      trim: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: ['open', 'complete', 'disbanded'],
      default: 'open',
    },
  },
  {
    timestamps: true,
  }
);

teamSchema.pre('save', function (next) {
  if (this.name && !this.teamName) this.teamName = this.name;
  if (this.teamName && !this.name) this.name = this.teamName;
  if (this.leaderId && !this.leader) this.leader = this.leaderId;
  if (this.leader && !this.leaderId) this.leaderId = this.leader;
  if (this.eventId && !this.event) this.event = this.eventId;
  if (this.event && !this.eventId) this.eventId = this.event;
  if (this.inviteCode && !this.joinCode) this.joinCode = this.inviteCode;
  if (this.joinCode && !this.inviteCode) this.inviteCode = this.joinCode;
  next();
});

export const Team = mongoose.model('Team', teamSchema);
export default Team;
