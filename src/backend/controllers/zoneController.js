// controllers/zoneController.js — Member 2: Backend Developer
const Zone = require('../models/Zone');
const User = require('../models/User');
const NGOProfile = require('../models/NGOProfile');
const HelpRequest = require('../models/HelpRequest');

// POST /api/zones — Create a new zone (NGO)
exports.createZone = async (req, res) => {
  try {
    const { name, description, boundaries, centerPoint, maxCapacity } = req.body;
    
    // Get NGO profile
    const ngo = await NGOProfile.findOne({ user: req.user._id });
    if (!ngo) return res.status(404).json({ success: false, messageKey: 'ngo.profileNotFound' });

    // Validate boundaries format (GeoJSON Polygon)
    if (!boundaries || boundaries.type !== 'Polygon' || !Array.isArray(boundaries.coordinates)) {
      return res.status(400).json({ success: false, messageKey: 'zone.invalidBoundaries' });
    }

    const zone = await Zone.create({
      ngo: ngo._id,
      name,
      description,
      boundaries,
      centerPoint,
      maxCapacity: maxCapacity || 50
    });

    // Add zone to NGO's zones array
    ngo.zones.push(zone._id);
    await ngo.save();

    res.status(201).json({ success: true, data: zone });
  } catch (err) {
    res.status(500).json({ success: false, messageKey: 'general.internalServerError' });
  }
};

// GET /api/zones — List all zones for NGO
exports.getNGOZones = async (req, res) => {
  try {
    const ngo = await NGOProfile.findOne({ user: req.user._id });
    if (!ngo) return res.status(404).json({ success: false, messageKey: 'ngo.profileNotFound' });

    const zones = await Zone.find({ _id: { $in: ngo.zones } })
      .populate('volunteers', 'name phone location');
    
    res.json({ success: true, count: zones.length, data: zones });
  } catch (err) {
    res.status(500).json({ success: false, messageKey: 'general.internalServerError' });
  }
};

// GET /api/zones/:id — Get single zone details
exports.getZoneById = async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id)
      .populate('volunteers', 'name phone location')
      .populate('ngo', 'orgName');
    
    if (!zone) return res.status(404).json({ success: false, messageKey: 'zone.zoneNotFound' });
    res.json({ success: true, data: zone });
  } catch (err) {
    res.status(500).json({ success: false, messageKey: 'general.internalServerError' });
  }
};

// PUT /api/zones/:id — Update zone details
exports.updateZone = async (req, res) => {
  try {
    const { name, description, boundaries, centerPoint, maxCapacity, isActive } = req.body;
    
    const zone = await Zone.findById(req.params.id);
    if (!zone) return res.status(404).json({ success: false, messageKey: 'zone.zoneNotFound' });

    // Verify NGO permission
    const ngo = await NGOProfile.findOne({ user: req.user._id });
    if (zone.ngo.toString() !== ngo._id.toString()) {
      return res.status(403).json({ success: false, messageKey: 'zone.cannotModifyOtherNGOZone' });
    }

    if (name) zone.name = name;
    if (description) zone.description = description;
    if (boundaries) zone.boundaries = boundaries;
    if (centerPoint) zone.centerPoint = centerPoint;
    if (maxCapacity) zone.maxCapacity = maxCapacity;
    if (isActive !== undefined) zone.isActive = isActive;

    await zone.save();
    res.json({ success: true, data: zone });
  } catch (err) {
    res.status(500).json({ success: false, messageKey: 'general.internalServerError' });
  }
};

// POST /api/zones/:id/assign-volunteer — Assign volunteer to zone
exports.assignVolunteerToZone = async (req, res) => {
  try {
    const { volunteerId } = req.body;
    
    // Verify NGO permission
    const ngo = await NGOProfile.findOne({ user: req.user._id });
    if (!ngo) return res.status(404).json({ success: false, messageKey: 'ngo.profileNotFound' });

    const zone = await Zone.findById(req.params.id);
    if (!zone) return res.status(404).json({ success: false, messageKey: 'zone.zoneNotFound' });

    if (zone.ngo.toString() !== ngo._id.toString()) {
      return res.status(403).json({ success: false, messageKey: 'zone.cannotModifyOtherNGOZone' });
    }

    // Check zone capacity
    if (zone.volunteers.length >= zone.maxCapacity) {
      return res.status(400).json({ success: false, messageKey: 'zone.zoneAtCapacity' });
    }

    // Verify volunteer exists and is not already in another zone
    const volunteer = await User.findById(volunteerId);
    if (!volunteer || volunteer.role !== 'volunteer') {
      return res.status(404).json({ success: false, messageKey: 'volunteer.volunteerNotFound' });
    }

    // Remove from previous zone if assigned
    if (volunteer.assignedZone) {
      await Zone.findByIdAndUpdate(
        volunteer.assignedZone,
        { $pull: { volunteers: volunteerId } }
      );
    }

    // Assign to new zone
    if (!zone.volunteers.includes(volunteerId)) {
      zone.volunteers.push(volunteerId);
      await zone.save();
    }

    // Update volunteer record
    volunteer.assignedZone = zone._id;
    volunteer.assignedNGO = ngo._id;
    await volunteer.save();

    // Add to NGO volunteers if not already there
    if (!ngo.volunteers.includes(volunteerId)) {
      ngo.volunteers.push(volunteerId);
      await ngo.save();
    }

    // Socket notification
    req.io.to(`zone-${zone._id}`).emit('volunteer-assigned', { 
      volunteerId, 
      zoneId: zone._id, 
      zoneName: zone.name 
    });

    res.json({ success: true, data: zone });
  } catch (err) {
    res.status(500).json({ success: false, messageKey: 'general.internalServerError' });
  }
};

// DELETE /api/zones/:id/remove-volunteer — Remove volunteer from zone
exports.removeVolunteerFromZone = async (req, res) => {
  try {
    const { volunteerId } = req.body;
    
    const ngo = await NGOProfile.findOne({ user: req.user._id });
    if (!ngo) return res.status(404).json({ success: false, messageKey: 'ngo.profileNotFound' });

    const zone = await Zone.findById(req.params.id);
    if (!zone) return res.status(404).json({ success: false, messageKey: 'zone.zoneNotFound' });

    if (zone.ngo.toString() !== ngo._id.toString()) {
      return res.status(403).json({ success: false, messageKey: 'zone.cannotModifyOtherNGOZone' });
    }

    // Remove volunteer from zone
    zone.volunteers = zone.volunteers.filter(v => v.toString() !== volunteerId);
    await zone.save();

    // Update volunteer
    const volunteer = await User.findById(volunteerId);
    if (volunteer && volunteer.assignedZone?.toString() === zone._id.toString()) {
      volunteer.assignedZone = null;
      await volunteer.save();
    }

    req.io.to(`zone-${zone._id}`).emit('volunteer-removed', { volunteerId, zoneId: zone._id });
    res.json({ success: true, data: zone });
  } catch (err) {
    res.status(500).json({ success: false, messageKey: 'general.internalServerError' });
  }
};

// DELETE /api/zones/:id — Delete a zone
exports.deleteZone = async (req, res) => {
  try {
    const ngo = await NGOProfile.findOne({ user: req.user._id });
    if (!ngo) return res.status(404).json({ success: false, messageKey: 'ngo.profileNotFound' });

    const zone = await Zone.findById(req.params.id);
    if (!zone) return res.status(404).json({ success: false, messageKey: 'zone.zoneNotFound' });

    if (zone.ngo.toString() !== ngo._id.toString()) {
      return res.status(403).json({ success: false, messageKey: 'zone.cannotModifyOtherNGOZone' });
    }

    // Remove volunteers' zone assignments
    await User.updateMany(
      { assignedZone: zone._id },
      { $set: { assignedZone: null } }
    );

    // Remove zone from NGO
    ngo.zones = ngo.zones.filter(z => z.toString() !== zone._id.toString());
    await ngo.save();

    // Delete zone
    await Zone.findByIdAndDelete(req.params.id);

    res.json({ success: true, messageKey: 'zone.zoneDeleted' });
  } catch (err) {
    res.status(500).json({ success: false, messageKey: 'general.internalServerError' });
  }
};
