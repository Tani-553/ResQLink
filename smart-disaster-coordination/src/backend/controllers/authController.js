const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { syncUserLocation } = require('../services/realtimeLocationService');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
const ALLOWED_ROLES = ['victim', 'volunteer', 'ngo', 'admin'];

const generateToken = (id) =>
  jwt.sign({ id }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isActive: user.isActive,
  isVerified: user.isVerified,
  location: user.location
});

exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!name || !email || !phone || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, password and role are required.'
      });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role selected.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: String(phone).trim(),
      password,
      role
    });

    const token = generateToken(user._id);
    return res.status(201).json({ success: true, token, user: serializeUser(user) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = generateToken(user._id);
    return res.json({ success: true, token, user: serializeUser(user) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMe = async (req, res) => {
  return res.json({ success: true, user: req.user });
};

exports.updateLocation = async (req, res) => {
  try {
    const longitude = Number(req.body.longitude);
    const latitude = Number(req.body.latitude);

    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      return res.status(400).json({ success: false, message: 'Valid longitude and latitude are required.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { location: { type: 'Point', coordinates: [longitude, latitude] } },
      { new: true }
    ).select('-password');

    await syncUserLocation({
      userId: user._id,
      role: user.role,
      longitude,
      latitude,
      source: 'api'
    });

    return res.json({ success: true, message: 'Location updated.', user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
