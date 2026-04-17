// controllers/requestController.js — Member 2: Backend Developer
const HelpRequest = require('../models/HelpRequest');
const User = require('../models/User');
const { sendNotificationToNearby } = require('../../notifications/fcmService');

// POST /api/requests — Submit SOS help request (Victim)
exports.createRequest = async (req, res) => {
  try {
    const { type, description, longitude, latitude, address, priority } = req.body;

    // Duplicate check: same victim, same type, pending within last 10 minutes
    const recent = await HelpRequest.findOne({
      victim: req.user._id, type, status: 'pending',
      createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) }
    });
    if (recent) return res.status(400).json({ success: false, message: 'Duplicate request detected. Your previous request is still active.' });

    const request = await HelpRequest.create({
      victim: req.user._id, type, description, priority: priority || 'medium',
      location: { type: 'Point', coordinates: [longitude, latitude], address },
      photo: req.file ? req.file.path : null
    });

    // Emit real-time event to volunteers in zone
    req.io.emit('new-sos-request', { requestId: request._id, type, location: { longitude, latitude }, priority });

    // Send push notifications to nearby volunteers
    await sendNotificationToNearby({ type, location: [longitude, latitude], requestId: request._id });

    res.status(201).json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/requests/nearby — Get nearby requests (Volunteer)
exports.getNearbyRequests = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 10000 } = req.query; // default 10km
    const requests = await HelpRequest.find({
      status: 'pending',
      location: { $near: { $geometry: { type: 'Point', coordinates: [+longitude, +latitude] }, $maxDistance: +maxDistance } }
    }).populate('victim', 'name phone').sort({ priority: -1, createdAt: -1 });
    res.json({ success: true, count: requests.length, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/requests/my — Victim's own requests
exports.getMyRequests = async (req, res) => {
  try {
    const requests = await HelpRequest.find({ victim: req.user._id })
      .populate('assignedVolunteer', 'name phone').sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/requests/:id/accept — Volunteer accepts request
exports.acceptRequest = async (req, res) => {
  try {
    const request = await HelpRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (request.status !== 'pending') return res.status(400).json({ success: false, message: 'Request is no longer available.' });

    request.assignedVolunteer = req.user._id;
    request.status = 'assigned';
    await request.save();

    req.io.emit('request-status-update', { requestId: request._id, status: 'assigned', volunteerId: req.user._id });
    res.json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/requests/:id/status — Update status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const request = await HelpRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });

    // Permission checks
    if (req.user.role === 'victim') {
      if (request.victim.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'You can only update your own requests.' });
      }
      if (!['resolved', 'cancelled'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Victims can only resolve or cancel their requests.' });
      }
    } else if (req.user.role === 'volunteer' || req.user.role === 'ngo') {
      if (request.assignedVolunteer?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'You can only update tasks assigned to you.' });
      }
    } // Admins can update any

    const updatedRequest = await HelpRequest.findByIdAndUpdate(
      req.params.id,
      { status, ...(status === 'resolved' ? { resolvedAt: new Date() } : {}) },
      { new: true }
    );
    req.io.emit('request-status-update', { requestId: updatedRequest._id, status });
    res.json({ success: true, data: updatedRequest });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/requests/all — Admin sees all requests
exports.getAllRequests = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    const requests = await HelpRequest.find(filter)
      .populate('victim', 'name phone')
      .populate('assignedVolunteer', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(+limit);
    const total = await HelpRequest.countDocuments(filter);
    res.json({ success: true, total, page: +page, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
