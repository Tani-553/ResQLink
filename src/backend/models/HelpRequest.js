// models/HelpRequest.js — Member 3: Database Engineer
const mongoose = require('mongoose');

const helpRequestSchema = new mongoose.Schema({
  victim: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['food', 'medical', 'shelter', 'rescue', 'other'], required: true },
  description: { type: String, required: [true, 'Description is required'], maxlength: 500 },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },  // [lng, lat]
    address: { type: String }
  },
  // Zone assignment - auto-determined based on location
  zone: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone', default: null },
  photo: { type: String },  // file path or URL
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in-progress', 'resolved', 'cancelled'],
    default: 'pending'
  },
  assignedVolunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedNGO: { type: mongoose.Schema.Types.ObjectId, ref: 'NGOProfile', default: null },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  isDuplicate: { type: Boolean, default: false },
  resolvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

helpRequestSchema.index({ location: '2dsphere' });
helpRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('HelpRequest', helpRequestSchema);
