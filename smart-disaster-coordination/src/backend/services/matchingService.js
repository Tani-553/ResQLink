const User = require('../models/User');

const findNearestVolunteers = async ({ longitude, latitude, maxDistance = 15000, limit = 5 }) => {
  const lng = Number(longitude);
  const lat = Number(latitude);

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return [];
  }

  const volunteers = await User.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distanceMeters',
        maxDistance: Number(maxDistance),
        query: { role: 'volunteer', isActive: true },
        spherical: true
      }
    },
    { $limit: Number(limit) },
    {
      $project: {
        _id: 1,
        name: 1,
        phone: 1,
        distanceMeters: { $round: ['$distanceMeters', 0] }
      }
    }
  ]);

  return volunteers;
};

module.exports = { findNearestVolunteers };
