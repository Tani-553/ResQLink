// routes/zoneRoutes.js — Member 2: Backend Developer
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createZone,
  getNGOZones,
  getZoneById,
  updateZone,
  assignVolunteerToZone,
  removeVolunteerFromZone,
  deleteZone
} = require('../controllers/zoneController');

// POST /api/zones — Create new zone (NGO)
router.post('/', protect, authorize('ngo'), createZone);

// GET /api/zones — List NGO's zones
router.get('/', protect, authorize('ngo'), getNGOZones);

// GET /api/zones/:id — Get single zone
router.get('/:id', protect, getZoneById);

// PUT /api/zones/:id — Update zone
router.put('/:id', protect, authorize('ngo'), updateZone);

// POST /api/zones/:id/assign-volunteer — Assign volunteer to zone
router.post('/:id/assign-volunteer', protect, authorize('ngo'), assignVolunteerToZone);

// DELETE /api/zones/:id/remove-volunteer — Remove volunteer from zone
router.delete('/:id/remove-volunteer', protect, authorize('ngo'), removeVolunteerFromZone);

// DELETE /api/zones/:id — Delete zone
router.delete('/:id', protect, authorize('ngo'), deleteZone);

module.exports = router;
