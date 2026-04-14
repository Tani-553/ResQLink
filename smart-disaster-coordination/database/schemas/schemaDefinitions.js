// database/schemas/schemaDefinitions.js - Member 3: Database Engineer
// Complete schema reference for all MongoDB collections

/**
 * COLLECTION: users
 * Purpose: Stores all system users across 4 roles
 */
const userSchemaRef = {
  _id: 'ObjectId (auto)',
  name: 'String - required',
  email: 'String - required, unique, indexed',
  phone: 'String - required',
  password: 'String - bcrypt hashed, select:false',
  role: 'Enum: victim | volunteer | ngo | admin',
  location: {
    type: 'Point',
    coordinates: '[longitude, latitude] - 2dsphere indexed'
  },
  isActive: 'Boolean - default true',
  isVerified: 'Boolean - default false',
  fcmToken: 'String - Firebase push token',
  webPushSubscription: 'Object - persisted browser push subscription',
  createdAt: 'Date - auto',
  updatedAt: 'Date - auto'
};

/**
 * COLLECTION: helprequests
 * Purpose: SOS requests submitted by victims
 * Indexes: location (2dsphere), status+createdAt
 */
const helpRequestSchemaRef = {
  _id: 'ObjectId (auto)',
  victim: 'ObjectId - ref: User',
  type: 'Enum: food | medical | shelter | rescue | other',
  description: 'String - max 500 chars',
  location: {
    type: 'Point',
    coordinates: '[longitude, latitude]',
    address: 'String - optional reverse geocode'
  },
  photo: 'String - file path or CDN URL',
  status: 'Enum: pending | assigned | in-progress | resolved | cancelled - default: pending',
  assignedVolunteer: 'ObjectId - ref: User, nullable',
  assignedNGO: 'ObjectId - ref: NGOProfile, nullable',
  priority: 'Enum: low | medium | high | critical - default: medium',
  isDuplicate: 'Boolean - duplicate detection flag',
  resolvedAt: 'Date - set when status = resolved',
  createdAt: 'Date - auto',
  updatedAt: 'Date - auto'
};

/**
 * COLLECTION: ngoprofiles
 * Purpose: NGO registration + verification + resource tracking
 */
const ngoProfileSchemaRef = {
  _id: 'ObjectId (auto)',
  user: 'ObjectId - ref: User, unique',
  orgName: 'String - required',
  description: 'String',
  documents: '[{ filename, path, uploadedAt }]',
  isApproved: 'Boolean - default false',
  approvedBy: 'ObjectId - ref: User (Admin), nullable',
  approvedAt: 'Date',
  volunteers: '[ObjectId] - ref: User[]',
  resources: {
    reliefKits: 'Number - default 0',
    shelters: 'Number - default 0',
    vehicles: 'Number - default 0',
    medicalSupplies: 'Number - default 0'
  },
  activeZones: '[String]',
  contactEmail: 'String',
  contactPhone: 'String',
  createdAt: 'Date - auto',
  updatedAt: 'Date - auto'
};

/**
 * COLLECTION: notifications
 * Purpose: Persistent notification history for all users
 * Indexes: recipient+isRead+createdAt
 */
const notificationSchemaRef = {
  _id: 'ObjectId (auto)',
  recipient: 'ObjectId - ref: User',
  type: 'Enum: new-request | request-accepted | task-update | ngo-approved | request-resolved | broadcast | ngo-pending',
  title: 'String - required',
  message: 'String - required',
  data: 'Mixed - extra payload (requestId, zone, ngoId ...)',
  isRead: 'Boolean - default false',
  triggeredBy: 'ObjectId - ref: User (actor)',
  createdAt: 'Date - auto',
  updatedAt: 'Date - auto'
};

module.exports = { userSchemaRef, helpRequestSchemaRef, ngoProfileSchemaRef, notificationSchemaRef };
