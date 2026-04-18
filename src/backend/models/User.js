// models/User.js — Member 3: Database Engineer
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true },
  email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true },
  phone: { type: String, required: [true, 'Phone is required'] },
  password: { type: String, required: [true, 'Password is required'], minlength: 6, select: false },
  role: { type: String, enum: ['victim', 'volunteer', 'ngo', 'admin'], required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }  // [longitude, latitude]
  },
  // Zone assignment for volunteers
  assignedZone: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone', default: null },
  // NGO that assigned this volunteer (if volunteer)
  assignedNGO: { type: mongoose.Schema.Types.ObjectId, ref: 'NGOProfile', default: null },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  fcmToken: { type: String },  // For push notifications
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

userSchema.index({ location: '2dsphere' });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare passwords
userSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);
