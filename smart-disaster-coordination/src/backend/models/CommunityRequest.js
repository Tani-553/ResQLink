// models/CommunityRequest.js - Help requests sent to community members
const mongoose = require('mongoose');

const communityRequestSchema = new mongoose.Schema({
  victim: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  communityMember: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityMember', required: true },
  description: { type: String, required: true, maxlength: 300 },
  status: {
    type: String,
    enum: ['waiting', 'accepted', 'declined'],
    default: 'waiting'
  },
  createdAt: { type: Date, default: Date.now },
  respondedAt: { type: Date }
}, { timestamps: true });

communityRequestSchema.index({ victim: 1, status: 1 });
communityRequestSchema.index({ communityMember: 1, status: 1 });

module.exports = mongoose.model('CommunityRequest', communityRequestSchema);
