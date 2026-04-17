// models/CommunityMember.js - Community Member Profile
const mongoose = require('mongoose');

const communityMemberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skills: { type: [String], default: [] },  // e.g. ["first-aid", "cooking", "driving", "shelter"]
  isAvailable: { type: Boolean, default: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }  // [lng, lat]
  },
  bio: { type: String, default: '', maxlength: 200 },
  helpCount: { type: Number, default: 0 },
  rating: { type: Number, default: 5.0, min: 0, max: 5 },
  languages: { type: [String], default: ['en'] },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

communityMemberSchema.index({ location: '2dsphere' });
communityMemberSchema.index({ user: 1 });

module.exports = mongoose.model('CommunityMember', communityMemberSchema);
