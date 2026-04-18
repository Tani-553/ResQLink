// middleware/authMiddleware.js — Member 2: Backend Developer
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ success: false, messageKey: 'auth.noToken' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ success: false, messageKey: 'auth.userNotFound' });
    next();
  } catch (err) {
    return res.status(401).json({ success: false, messageKey: 'auth.tokenInvalid' });
  }
};

// Role-based access control
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, messageKey: 'auth.roleUnauthorized', role: req.user.role });
  }
  next();
};

module.exports = { protect, authorize };
