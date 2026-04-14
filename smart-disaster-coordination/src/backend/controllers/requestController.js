const HelpRequest = require('../models/HelpRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendNotificationToNearby, notifyVictimAccepted, sendToMany } = require('../../notifications/fcmService');
const { sendWebPushToMany } = require('../../notifications/pushService');
const { findNearestVolunteers } = require('../services/matchingService');

const VALID_STATUSES = ['pending', 'assigned', 'in-progress', 'resolved', 'cancelled'];
const PRIORITY_WEIGHT = { low: 1, medium: 2, high: 3, critical: 4 };

const emitRequestEvent = (req, event, payload) => {
  req.io.emit(event, payload);
  if (payload?.requestId) {
    req.io.to(`request-${payload.requestId}`).emit(event, payload);
  }
};

exports.createRequest = async (req, res) => {
  try {
    const { type, description, longitude, latitude, address, priority } = req.body;
    const lng = Number(longitude);
    const lat = Number(latitude);
    const normalizedPriority = priority || 'medium';

    if (!type || !description) {
      return res.status(400).json({ success: false, message: 'Request type and description are required.' });
    }

    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return res.status(400).json({ success: false, message: 'Valid longitude and latitude are required.' });
    }

    const recent = await HelpRequest.findOne({
      victim: req.user._id,
      type,
      status: 'pending',
      createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) }
    }).where('location').near({
      center: { type: 'Point', coordinates: [lng, lat] },
      maxDistance: 300,
      spherical: true
    });

    if (recent) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate request detected. Your previous request is still active.',
        duplicateRequestId: recent._id
      });
    }

    const nearestVolunteers = await findNearestVolunteers({
      longitude: lng,
      latitude: lat,
      maxDistance: 15000,
      limit: 5
    });

    const helpRequest = await HelpRequest.create({
      victim: req.user._id,
      type,
      description,
      priority: normalizedPriority,
      location: { type: 'Point', coordinates: [lng, lat], address },
      photo: req.file ? req.file.path : null
    });

    emitRequestEvent(req, 'new-sos-request', {
      requestId: helpRequest._id,
      type,
      location: { longitude: lng, latitude: lat },
      priority: normalizedPriority,
      nearestVolunteerIds: nearestVolunteers.map(v => v._id)
    });

    await sendNotificationToNearby({ type, location: [lng, lat], requestId: helpRequest._id });

    return res.status(201).json({
      success: true,
      data: helpRequest,
      matching: {
        volunteersFound: nearestVolunteers.length,
        nearestVolunteers
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getNearbyRequests = async (req, res) => {
  try {
    const fallbackCoordinates = req.user?.location?.coordinates || [];
    const longitude = Number(req.query.longitude ?? fallbackCoordinates[0]);
    const latitude = Number(req.query.latitude ?? fallbackCoordinates[1]);
    const maxDistance = Number(req.query.maxDistance || 10000);

    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      return res.status(400).json({ success: false, message: 'Volunteer location is required to fetch nearby requests.' });
    }

    const requests = await HelpRequest.find({
      status: 'pending',
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: maxDistance
        }
      }
    })
      .populate('victim', 'name phone')
      .sort({ createdAt: -1 });

    const sortedRequests = requests.sort((a, b) => {
      const priorityDelta = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
      if (priorityDelta !== 0) return priorityDelta;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return res.json({ success: true, count: sortedRequests.length, data: sortedRequests });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyRequests = async (req, res) => {
  try {
    const requests = await HelpRequest.find({ victim: req.user._id })
      .populate('assignedVolunteer', 'name phone')
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: requests });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.acceptRequest = async (req, res) => {
  try {
    const volunteer = await User.findById(req.user._id).select('name isActive');
    if (!volunteer?.isActive) {
      return res.status(403).json({ success: false, message: 'Inactive volunteers cannot accept tasks.' });
    }

    const helpRequest = await HelpRequest.findById(req.params.id);
    if (!helpRequest) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    if (helpRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request is no longer available.' });
    }

    helpRequest.assignedVolunteer = req.user._id;
    helpRequest.status = 'assigned';
    await helpRequest.save();

    emitRequestEvent(req, 'request-status-update', {
      requestId: helpRequest._id,
      status: 'assigned',
      volunteerId: req.user._id
    });

    await notifyVictimAccepted(helpRequest.victim, volunteer.name || 'A volunteer', helpRequest._id);
    return res.json({ success: true, data: helpRequest });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid request status.' });
    }

    const helpRequest = await HelpRequest.findById(req.params.id);
    if (!helpRequest) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const isVolunteer = req.user.role === 'volunteer';
    const assignedVolunteerId = helpRequest.assignedVolunteer?.toString();
    if (isVolunteer && assignedVolunteerId !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only update requests assigned to you.' });
    }

    helpRequest.status = status;
    helpRequest.resolvedAt = status === 'resolved' ? new Date() : undefined;
    await helpRequest.save();

    emitRequestEvent(req, 'request-status-update', {
      requestId: helpRequest._id,
      status
    });

    const requestId = helpRequest._id.toString();
    const title = status === 'resolved' ? 'Request Resolved' : 'Request Status Updated';
    const message = `Your request is now marked as "${status}".`;
    const notifications = [{
      recipient: helpRequest.victim,
      type: status === 'resolved' ? 'request-resolved' : 'task-update',
      title,
      message,
      data: { requestId, status },
      triggeredBy: req.user._id
    }];
    const pushRecipients = [helpRequest.victim];

    if (status === 'resolved' && helpRequest.assignedVolunteer) {
      notifications.push({
        recipient: helpRequest.assignedVolunteer,
        type: 'request-resolved',
        title,
        message: 'The request assigned to you has been marked as "resolved".',
        data: { requestId, status },
        triggeredBy: req.user._id
      });
      pushRecipients.push(helpRequest.assignedVolunteer);
    }

    if (status !== 'resolved') {
      const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
      notifications.push(...admins.map((admin) => ({
        recipient: admin._id,
        type: 'task-update',
        title: `Request ${status}`,
        message: `Request ${requestId} is now marked as "${status}".`,
        data: { requestId, status },
        triggeredBy: req.user._id
      })));
      pushRecipients.push(...admins.map((admin) => admin._id));
    }

    await Notification.insertMany(notifications);
    await sendToMany(pushRecipients, { title, body: message, data: { requestId, status } });
    await sendWebPushToMany(pushRecipients, { title, body: message, data: { requestId, status } });

    return res.json({ success: true, data: helpRequest });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllRequests = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (type) filter.type = type;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.max(Number(limit) || 20, 1);

    const requests = await HelpRequest.find(filter)
      .populate('victim', 'name phone')
      .populate('assignedVolunteer', 'name')
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    const total = await HelpRequest.countDocuments(filter);

    return res.json({
      success: true,
      total,
      page: pageNumber,
      pages: Math.ceil(total / limitNumber) || 1,
      data: requests
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
