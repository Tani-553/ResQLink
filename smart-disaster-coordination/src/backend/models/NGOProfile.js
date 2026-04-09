// models/NGOProfile.js — Member 3: Database Engineer
const mongoose = require('mongoose');

const ngoProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  orgName: { type: String, required: true, trim: true },
  description: { type: String },
  documents: [{ filename: String, path: String, uploadedAt: { type: Date, default: Date.now } }],
  isApproved: { type: Boolean, default: false },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date },
  volunteers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  resources: {
    reliefKits: { type: Number, default: 0 },
    shelters: { type: Number, default: 0 },
    vehicles: { type: Number, default: 0 },
    medicalSupplies: { type: Number, default: 0 }
  },
  activeZones: [{ type: String }],
  contactEmail: { type: String },
  contactPhone: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('NGOProfile', ngoProfileSchema);
