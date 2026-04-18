// models/Zone.js — Member 3: Database Engineer
const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
  ngo: { type: mongoose.Schema.Types.ObjectId, ref: 'NGOProfile', required: true },
  name: { type: String, required: true, trim: true },  // e.g., "Downtown", "North District"
  description: { type: String },
  // Geographic boundary - polygon coordinates [longitude, latitude]
  // GeoJSON format for geographic queries
  boundaries: {
    type: {
      type: String,
      enum: ['Polygon'],
      default: 'Polygon'
    },
    coordinates: {
      type: [[[Number]]],  // Array of polygon rings (first ring is exterior, rest are holes)
      required: true
    }
  },
  // Center point for approximate zone location
  centerPoint: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: { type: [Number] }  // [longitude, latitude]
  },
  volunteers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  maxCapacity: { type: Number, default: 50 },  // Max volunteers in zone
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for geospatial queries
zoneSchema.index({ 'boundaries': '2dsphere' });
zoneSchema.index({ ngo: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Zone', zoneSchema);
