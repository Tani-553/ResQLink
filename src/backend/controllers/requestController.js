// controllers/requestController.js — Member 2: Backend Developer
const HelpRequest = require('../models/HelpRequest');
const User = require('../models/User');
const Zone = require('../models/Zone');
const { sendNotificationToNearby } = require('../../notifications/fcmService');

// Helper function to find zone containing a point
async function findZoneForLocation(longitude, latitude, ngoId = null) {
  try {
    const query = {
      boundaries: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          }
        }
      }
    };
    if (ngoId) query.ngo = ngoId;
    
    const zone = await Zone.findOne(query);
    return zone;
  } catch (err) {
    console.log('Zone detection error:', err);
    return null;
  }
}

// POST /api/requests — Submit SOS help request (Victim)
exports.createRequest = async (req, res) => {
  try {
    const { type, description, longitude, latitude, address, priority } = req.body;

    // Duplicate check: same victim, same type, pending within last 10 minutes
    const recent = await HelpRequest.findOne({
      victim: req.user._id, type, status: 'pending',
      createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) }
    });
    if (recent) return res.status(400).json({ success: false, messageKey: 'request.duplicateRequestDetected' });

    // Auto-detect zone based on location
    const zone = await findZoneForLocation(longitude, latitude);

    const request = await HelpRequest.create({
      victim: req.user._id, type, description, priority: priority || 'medium',
      location: { type: 'Point', coordinates: [longitude, latitude], address },
      zone: zone ? zone._id : null,
      photo: req.file ? req.file.path : null
    });

    // Emit real-time event to volunteers in zone
    if (zone) {
      req.io.to(`zone-${zone._id}`).emit('new-sos-request', { 
        requestId: request._id, 
        type, 
        location: { longitude, latitude }, 
        priority,
        zone: zone.name,
        zoneId: zone._id
      });
    }

    // Send push notifications to nearby volunteers in same zone
    await sendNotificationToNearby({ type, location: [longitude, latitude], requestId: request._id, zoneId: zone?._id });

    res.status(201).json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/requests/nearby — Get nearby requests (Volunteer) - filtered by zone
exports.getNearbyRequests = async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 10000 } = req.query; // default 10km
    if (!longitude || !latitude) return res.status(400).json({ success: false, messageKey: 'request.volunteerLocationRequired' });
    
    // Get volunteer's assigned zone
    const volunteer = await User.findById(req.user._id);
    let query = {
      status: 'pending',
      location: { $near: { $geometry: { type: 'Point', coordinates: [+longitude, +latitude] }, $maxDistance: +maxDistance } }
    };

    // Filter by zone if volunteer is assigned to one
    if (volunteer.assignedZone) {
      query.zone = volunteer.assignedZone;
    }

    const requests = await HelpRequest.find(query)
      .populate('victim', 'name phone')
      .populate('zone', 'name')
      .sort({ priority: -1, createdAt: -1 });
    
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
    if (!request) return res.status(404).json({ success: false, messageKey: 'request.requestNotFound' });
    if (request.status !== 'pending') return res.status(400).json({ success: false, messageKey: 'request.requestNoLongerAvailable' });

    // Verify volunteer is assigned to the request's zone (if zone exists)
    const volunteer = await User.findById(req.user._id);
    if (request.zone && volunteer.assignedZone) {
      if (request.zone.toString() !== volunteer.assignedZone.toString()) {
        return res.status(403).json({ success: false, messageKey: 'request.requestOutsideYourZone' });
      }
    }

    request.assignedVolunteer = req.user._id;
    request.status = 'assigned';
    await request.save();

    // Notify in zone channel
    if (request.zone) {
      req.io.to(`zone-${request.zone}`).emit('request-status-update', { requestId: request._id, status: 'assigned', volunteerId: req.user._id });
    } else {
      req.io.emit('request-status-update', { requestId: request._id, status: 'assigned', volunteerId: req.user._id });
    }
    
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
    if (!request) return res.status(404).json({ success: false, messageKey: 'request.requestNotFound' });

    // Permission checks
    if (req.user.role === 'victim') {
      if (request.victim.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, messageKey: 'request.cannotUpdateOwnRequest' });
      }
      if (!['resolved', 'cancelled'].includes(status)) {
        return res.status(400).json({ success: false, messageKey: 'request.invalidRequestStatus' });
      }
    } else if (req.user.role === 'volunteer' || req.user.role === 'ngo') {
      if (request.assignedVolunteer?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, messageKey: 'request.cannotUpdateOtherRequests' });
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
    res.status(500).json({ success: false, messageKey: 'general.internalServerError' });
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
