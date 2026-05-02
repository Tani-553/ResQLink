const HelpRequest = require('../models/HelpRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendNotificationToNearby, notifyVictimAccepted, sendToMany } = require('../../notifications/fcmService');
const { sendWebPushToMany } = require('../../notifications/pushService');
const { findNearestVolunteers } = require('../services/matchingService');

const VALID_STATUSES = ['pending', 'assigned', 'in-progress', 'resolved', 'cancelled'];
const PRIORITY_WEIGHT = { low: 1, medium: 2, high: 3, critical: 4 };

const emitRequestEvent = (req, event, payload) => {
  try {
    if (!req.io) return; // ✅ prevent crash

    req.io.emit(event, payload);

    if (payload?.requestId) {
      req.io.to(`request-${payload.requestId}`).emit(event, payload);
    }
  } catch (err) {
    console.log("Socket error:", err.message);
  }
};

exports.createRequest = async (req, res) => {
  try {
    const { type, description, longitude, latitude, address, priority } = req.body;
    const lng = Number(longitude);
    const lat = Number(latitude);
    const normalizedPriority = priority || 'medium';
    const normalizedDescription = typeof description === 'string' ? description.trim() : '';

    if (!type || !normalizedDescription) {
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

    let nearestVolunteers = [];
try {
  nearestVolunteers = await findNearestVolunteers({
    longitude: lng,
    latitude: lat,
    maxDistance: 15000,
    limit: 5
  });
} catch (err) {
  console.log("Matching error:", err.message);
}

    const helpRequest = await HelpRequest.create({
      victim: req.user._id,
      type,
      description: normalizedDescription,
      priority: normalizedPriority,
      location: { type: 'Point', coordinates: [lng, lat], address },
      photo: req.file ? req.file.path : null
    });

    const createdRequest = await HelpRequest.findById(helpRequest._id)
      .populate('victim', 'name phone')
      .populate('assignedVolunteer', 'name phone');

    const realtimePayload = {
      ...createdRequest.toObject(),
      requestId: helpRequest._id.toString(),
      nearestVolunteerIds: nearestVolunteers.map((volunteer) => volunteer._id.toString())
    };

    emitRequestEvent(req, 'new-sos-request', realtimePayload);
    emitRequestEvent(req, 'sos-alert', realtimePayload);

    try {
  await sendNotificationToNearby({
    type,
    location: [lng, lat],
    requestId: helpRequest._id
  });
} catch (err) {
  console.log("Notification error:", err.message);
}

    return res.status(201).json({
      success: true,
      data: createdRequest,
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
      .populate('assignedVolunteer', 'name phone location')
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
    helpRequest.volunteerResolved = false;
    helpRequest.victimResolved = false;
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
    const isVictim = req.user.role === 'victim';
    const isAdmin = req.user.role === 'admin';
    const isNGO = req.user.role === 'ngo';
    const assignedVolunteerId = helpRequest.assignedVolunteer?.toString();
    const userId = req.user._id.toString();
    const victimId = helpRequest.victim?.toString();

    // Authorization checks
    if (isVolunteer && assignedVolunteerId !== userId) {
      return res.status(403).json({ success: false, message: 'You can only update requests assigned to you.' });
    }

    if (isVictim && victimId !== userId) {
      return res.status(403).json({ success: false, message: 'You can only update your own requests.' });
    }

    // Allow resolved status only for victims and assigned volunteers
    if (status === 'resolved' && !isVictim && !isVolunteer && !isAdmin && !isNGO) {
      return res.status(403).json({ success: false, message: 'You do not have permission to resolve this request.' });
    }

    helpRequest.status = status;
    if (status === 'resolved') {
      helpRequest.resolvedAt = new Date();
      // If victim or volunteer marks as resolved, set their flag
      if (isVictim) {
        helpRequest.victimResolved = true;
      } else if (isVolunteer) {
        helpRequest.volunteerResolved = true;
      } else {
        // Admin or NGO - set both
        helpRequest.volunteerResolved = true;
        helpRequest.victimResolved = true;
      }
    } else {
      helpRequest.resolvedAt = undefined;
      helpRequest.volunteerResolved = false;
      helpRequest.victimResolved = false;
    }
    await helpRequest.save();

    emitRequestEvent(req, 'request-status-update', {
      requestId: helpRequest._id,
      status
    });

    const requestId = helpRequest._id.toString();
    const title = status === 'resolved' ? 'Request Resolved' : 'Request Status Updated';
    const messageByVictim = isVictim ? `Your request has been marked as resolved. Thank you!` : `Your request is now marked as "${status}".`;
    const message = messageByVictim;
    const notifications = [{
      recipient: helpRequest.victim,
      type: status === 'resolved' ? 'request-resolved' : 'task-update',
      title,
      message: isVictim ? `Your request has been marked as resolved. Thank you!` : message,
      data: { requestId, status },
      triggeredBy: req.user._id
    }];
    const pushRecipients = [helpRequest.victim];

    if (status === 'resolved' && helpRequest.assignedVolunteer) {
      notifications.push({
        recipient: helpRequest.assignedVolunteer,
        type: 'request-resolved',
        title,
        message: isVolunteer ? `You have marked your task as resolved.` : `Request #${requestId.substring(0, 8)} has been resolved successfully`,
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

exports.confirmResolution = async (req, res) => {
  try {
    const { confirmed } = req.body;
    if (typeof confirmed !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Confirmed must be a boolean.' });
    }

    const helpRequest = await HelpRequest.findById(req.params.id)
      .populate('assignedVolunteer', 'name')
      .populate('victim', 'name');
    if (!helpRequest) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    if (!helpRequest.assignedVolunteer) {
      return res.status(400).json({ success: false, message: 'Cannot confirm resolution before a volunteer is assigned.' });
    }

    const isVolunteer = req.user.role === 'volunteer';
    const isVictim = req.user.role === 'victim';
    if (isVolunteer) {
      if (helpRequest.assignedVolunteer._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'You can only update requests assigned to you.' });
      }
      helpRequest.volunteerResolved = confirmed;
    } else if (isVictim) {
      if (helpRequest.victim.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'You can only update your own request.' });
      }
      helpRequest.victimResolved = confirmed;
    } else {
      return res.status(403).json({ success: false, message: 'Only volunteers and victims may confirm resolution.' });
    }

    const wasResolved = helpRequest.status === 'resolved';
    const bothConfirmed = helpRequest.volunteerResolved && helpRequest.victimResolved;

    if (bothConfirmed) {
      helpRequest.status = 'resolved';
      helpRequest.resolvedAt = new Date();
    } else if (wasResolved && !bothConfirmed) {
      helpRequest.status = 'in-progress';
      helpRequest.resolvedAt = undefined;
    }

    await helpRequest.save();

    const requestId = helpRequest._id.toString();
    const confirmationActor = isVolunteer ? 'Volunteer' : 'Victim';
    const title = bothConfirmed ? 'Request Resolved' : confirmed ? `${confirmationActor} Confirmed Resolve` : `${confirmationActor} Marked Unresolved`;
    const bodyMessage = bothConfirmed
      ? 'Both volunteer and victim have confirmed the request is resolved.'
      : confirmed
      ? `${confirmationActor} confirmed the request is resolved. Waiting on the other party.`
      : `${confirmationActor} marked the request as unresolved.`;

    const notifications = [];
    const pushRecipients = [];

    const payload = {
      requestId,
      status: helpRequest.status,
      volunteerResolved: helpRequest.volunteerResolved,
      victimResolved: helpRequest.victimResolved
    };

    notifications.push({
      recipient: helpRequest.victim,
      type: bothConfirmed ? 'request-resolved' : 'task-update',
      title,
      message: bodyMessage,
      data: { ...payload, confirmedBy: req.user.role },
      triggeredBy: req.user._id
    });
    pushRecipients.push(helpRequest.victim);

    notifications.push({
      recipient: helpRequest.assignedVolunteer._id,
      type: bothConfirmed ? 'request-resolved' : 'task-update',
      title,
      message: bodyMessage,
      data: { ...payload, confirmedBy: req.user.role },
      triggeredBy: req.user._id
    });
    pushRecipients.push(helpRequest.assignedVolunteer._id);

    const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
    notifications.push(...admins.map((admin) => ({
      recipient: admin._id,
      type: bothConfirmed ? 'request-resolved' : 'task-update',
      title,
      message: bodyMessage,
      data: payload,
      triggeredBy: req.user._id
    })));
    pushRecipients.push(...admins.map((admin) => admin._id));

    await Notification.insertMany(notifications);
    await sendToMany(pushRecipients, { title, body: bodyMessage, data: payload });
    await sendWebPushToMany(pushRecipients, { title, body: bodyMessage, data: payload });

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
      .populate('assignedVolunteer', 'name location')
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
