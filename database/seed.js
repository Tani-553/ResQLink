// database/seed.js — Member 3: Database Engineer
// Seed script to populate the DB with sample disaster scenario data

require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const User = require('../src/backend/models/User');
const HelpRequest = require('../src/backend/models/HelpRequest');
const NGOProfile = require('../src/backend/models/NGOProfile');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/disaster_coordination');
  console.log('✅ Connected to MongoDB for seeding');
};

const seedUsers = [
  { name: 'Priya Victim', email: 'victim1@test.com', phone: '9000000001', password: 'Test@1234', role: 'victim' },
  { name: 'Ravi Volunteer', email: 'volunteer1@test.com', phone: '9000000002', password: 'Test@1234', role: 'volunteer' },
  { name: 'HelpFirst NGO', email: 'ngo1@test.com', phone: '9000000003', password: 'Test@1234', role: 'ngo' },
  { name: 'System Admin', email: 'admin@test.com', phone: '9000000004', password: 'Test@1234', role: 'admin', isVerified: true },
];

const seed = async () => {
  await connectDB();
  await User.deleteMany({});
  await HelpRequest.deleteMany({});
  await NGOProfile.deleteMany({});
  console.log('🗑️  Cleared existing data');

  const users = await User.create(seedUsers);
  console.log(`👥 Created ${users.length} users`);

  const victim = users.find(u => u.role === 'victim');
  const volunteer = users.find(u => u.role === 'volunteer');

  // Set sample locations (Chennai coords)
  await User.findByIdAndUpdate(volunteer._id, {
    location: { type: 'Point', coordinates: [80.2707, 13.0827] }
  });

  await HelpRequest.create([
    {
      victim: victim._id,
      type: 'rescue',
      description: 'Flood victim trapped on rooftop in Zone 4',
      priority: 'critical',
      location: { type: 'Point', coordinates: [80.2750, 13.0900], address: 'Zone 4, Chennai' },
      status: 'pending'
    },
    {
      victim: victim._id,
      type: 'food',
      description: 'Family of 5 needs food and drinking water',
      priority: 'high',
      location: { type: 'Point', coordinates: [80.2680, 13.0780], address: 'Zone 2, Chennai' },
      status: 'assigned',
      assignedVolunteer: volunteer._id
    },
    {
      victim: victim._id,
      type: 'medical',
      description: 'Elderly person needs urgent medical attention',
      priority: 'critical',
      location: { type: 'Point', coordinates: [80.2600, 13.0850], address: 'Zone 3, Chennai' },
      status: 'resolved',
      resolvedAt: new Date()
    }
  ]);
  console.log('🆘 Created 3 sample help requests');

  const ngoUser = users.find(u => u.role === 'ngo');
  await NGOProfile.create({
    user: ngoUser._id,
    orgName: 'HelpFirst NGO',
    description: 'Disaster relief NGO based in Chennai',
    isApproved: true,
    resources: { reliefKits: 120, shelters: 6, vehicles: 4, medicalSupplies: 80 },
    activeZones: ['Zone 2', 'Zone 4'],
    contactEmail: 'contact@helpfirst.org'
  });
  console.log('🏢 Created sample NGO profile');

  console.log('\n✅ Seeding complete!');
  console.log('─────────────────────────────────');
  console.log('Test credentials:');
  seedUsers.forEach(u => console.log(`  ${u.role.padEnd(10)} | ${u.email} | ${u.password}`));
  console.log('─────────────────────────────────');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
