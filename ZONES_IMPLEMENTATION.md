# Location Zones System - Implementation Guide

## Overview
The disaster coordination system now includes a **Location Zones** feature that allows NGOs to:
- Divide their operational area into geographic zones
- Assign volunteers to specific zones
- Automatically route help requests to appropriate zone volunteers
- Track volunteer capacity per zone

## Architecture

### Backend Models

#### Zone Model (`src/backend/models/Zone.js`)
```javascript
{
  ngo: ObjectId,                    // NGO that owns this zone
  name: String,                      // "Downtown", "North District", etc.
  description: String,
  boundaries: {                      // GeoJSON Polygon for zone coverage area
    type: "Polygon",
    coordinates: [[[lng, lat], ...]]
  },
  centerPoint: {                     // Center point of zone
    type: "Point",
    coordinates: [lng, lat]
  },
  volunteers: [ObjectId],            // Volunteers assigned to this zone
  maxCapacity: Number,               // Max volunteers per zone (default: 50)
  isActive: Boolean
}
```

#### User Model Updates
```javascript
{
  // Existing fields...
  assignedZone: ObjectId,            // NEW: Zone assigned to volunteer
  assignedNGO: ObjectId              // NEW: NGO that assigned volunteer
}
```

#### HelpRequest Model Updates
```javascript
{
  // Existing fields...
  zone: ObjectId                     // NEW: Auto-detected zone based on location
}
```

### API Endpoints

#### Zone Management (NGO)
```
POST   /api/zones                    // Create new zone
GET    /api/zones                    // List NGO's zones
GET    /api/zones/:id                // Get zone details
PUT    /api/zones/:id                // Update zone
DELETE /api/zones/:id                // Delete zone

POST   /api/zones/:id/assign-volunteer    // Add volunteer to zone
DELETE /api/zones/:id/remove-volunteer    // Remove volunteer from zone
```

#### Request Flow (Auto Zone Detection)
1. **Create Request** (Victim)
   - Location coordinates → Zone detection (point-in-polygon check)
   - Automatically assign request to matching zone
   - Notify zone volunteers only

2. **Get Nearby Requests** (Volunteer)
   - Filter by volunteer's assigned zone
   - Only show requests within their zone
   - Distance-based filtering within zone

3. **Accept Request** (Volunteer)
   - Verify volunteer's zone matches request's zone
   - Prevent cross-zone acceptance

## Implementation Details

### Zone Detection (Geographic)
When a victim creates a help request:
```javascript
const zone = await Zone.findOne({
  boundaries: {
    $geoIntersects: {
      $geometry: { type: 'Point', coordinates: [lng, lat] }
    }
  }
});
```

### Socket Events
- `new-sos-request` → Broadcast to zone channel only
- `volunteer-assigned` → Zone volunteers notified
- `request-status-update` → Zone-specific updates

### Volunteer Assignment Flow
1. NGO creates zone with polygon boundaries
2. NGO selects volunteer → System assigns to zone
3. Volunteer's `assignedZone` field updated
4. Volunteer automatically sees only zone requests

## Frontend Components

### ZoneManagement Component
- **Location**: `src/frontend/src/components/ZoneManagement.jsx`
- **Features**:
  - Create zones with center point + description
  - View all zones in card grid
  - Edit zone capacity
  - Assign/remove volunteers
  - Delete zones
  - Real-time volunteer count per zone

### Integration with NGO Dashboard
```javascript
// In NGODashboard.jsx
<ZoneManagement />
```

## Database Indices
```javascript
zoneSchema.index({ 'boundaries': '2dsphere' });
zoneSchema.index({ ngo: 1, name: 1 }, { unique: true });
userSchema.index({ assignedZone: 1 });
helpRequestSchema.index({ zone: 1 });
```

## Translation Keys

### Backend (API Errors)
```javascript
"zone": {
  "zoneCreated": "Zone created successfully",
  "zoneNotFound": "Zone not found",
  "invalidBoundaries": "Invalid zone boundaries",
  "zoneAtCapacity": "Zone has reached max volunteers",
  "cannotModifyOtherNGOZone": "Permission denied"
}
```

### Frontend (UI)
```javascript
"zone": {
  "zoneManagement": "Zone Management",
  "createZone": "Create Zone",
  "manageVolunteers": "Manage Volunteers"
  // ... see locales/en.json
}
```

## Usage Example

### 1. NGO Creates Zone
```
POST /api/zones
{
  "name": "Downtown District",
  "description": "Central business area",
  "centerPoint": { "longitude": 77.2245, "latitude": 28.6345 },
  "boundaries": {
    "type": "Polygon",
    "coordinates": [[[lng1, lat1], [lng2, lat2], ...]]
  },
  "maxCapacity": 30
}
```

### 2. Assign Volunteer to Zone
```
POST /api/zones/{zoneId}/assign-volunteer
{
  "volunteerId": "user123"
}
```

### 3. Victim Creates Request (Auto Zone Detection)
```
POST /api/requests
{
  "type": "medical",
  "description": "Need first aid",
  "longitude": 77.229,
  "latitude": 28.6330,
  "address": "Main Street"
}
// Backend auto-detects zone, if found:
// request.zone = zoneId (for that downtown zone)
```

### 4. Volunteer Sees Requests Only in Their Zone
```
GET /api/requests/nearby?longitude=77.229&latitude=28.6330
// Returns only requests WHERE zone = volunteer.assignedZone
```

## Security & Permissions

### Zone Access Control
```javascript
// Only NGO that created zone can modify it
if (zone.ngo.toString() !== ngo._id.toString()) {
  return res.status(403).json({ messageKey: 'zone.cannotModifyOtherNGOZone' });
}
```

### Volunteer Assignment Rules
- Can only assign active volunteers
- Cannot exceed zone capacity
- Automatic removal from previous zone
- Prevents duplicate assignments

### Request Acceptance Rules
- Volunteer can only accept requests in their assigned zone
- Returns error: `'request.requestOutsideYourZone'`
- Zone filter applied at database query level

## Testing Checklist

- [ ] Create zone with valid polygon boundaries
- [ ] Assign volunteer to zone → User.assignedZone updated
- [ ] Create request in zone → Auto zone detection works
- [ ] Volunteer sees only zone requests
- [ ] Volunteer cannot accept cross-zone requests
- [ ] Remove volunteer from zone → User.assignedZone cleared
- [ ] Delete zone → All volunteers unassigned
- [ ] Zone capacity enforcement
- [ ] Socket events broadcast to correct zone channels
- [ ] Multilingual messages display correctly

## Migration Notes

### Database Updates Required
If upgrading existing system:
```javascript
// Add zone field to existing requests
db.helprequests.updateMany({}, { $set: { zone: null } });

// Add zone fields to existing users
db.users.updateMany({}, { $set: { assignedZone: null, assignedNGO: null } });
```

## Performance Optimization

1. **Geospatial Indexing**: 2dsphere index on zone boundaries
2. **Zone Caching**: Cache zone boundaries in memory for frequent lookups
3. **Volunteer Distribution**: Balance volunteers across zones
4. **Socket Rooms**: Use zone IDs as socket.io room names

## Future Enhancements

- [ ] Interactive map UI for zone boundary drawing
- [ ] Heatmap showing requests density per zone
- [ ] Auto-rebalancing volunteer distribution
- [ ] Zone-based resource allocation
- [ ] Volunteer skill filtering per zone
- [ ] Multi-zone volunteer assignments
- [ ] Historical zone performance analytics
