/**
 * Seed script: resets the users collection and creates the TWO privileged
 * accounts (admin + officer). Viewers are intentionally left empty because
 * viewer login creates accounts on the fly (username-only, no password).
 * Existing videos / analyses / reports are re-linked to the officer.
 * Run once:  node scripts/seed-admin.js   (or: npm run seed)
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const Video = require('../models/Video');
const Analysis = require('../models/Analysis');
const Report = require('../models/Report');
const env = require('../config/env');

const SAMPLE_USERS = [
  {
    name: 'Rashmi',
    username: 'rashmi',
    email: 'rashmi@gmail.com',
    officerId: 'ADMIN-0001',
    phone: '+94 77 000 0001',
    password: 'Rashmi@2007',
    role: 'admin',
    active: true,
  },
  {
    name: 'Rasika',
    username: 'rasika',
    email: 'rasika@gmail.com',
    officerId: 'WS-1001',
    phone: '+94 77 000 1001',
    password: 'Rasika@2006',
    role: 'officer',
    active: true,
  },
];

async function seed() {
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 5000 });
  console.log('Connected to MongoDB');

  const deleted = await User.deleteMany({});
  console.log(`Deleted ${deleted.deletedCount} existing user(s)`);

  let officerUser;
  for (const account of SAMPLE_USERS) {
    const user = await User.create(account);
    console.log(`Created ${account.role}: ${account.email}`);
    if (account.role === 'officer') officerUser = user;
  }

  const reassign = await Promise.all([
    Video.updateMany({}, { uploadedBy: officerUser._id }),
    Analysis.updateMany({}, { requestedBy: officerUser._id }),
    Report.updateMany({}, { generatedBy: officerUser._id }),
  ]);
  console.log(
    `Re-linked data to officer: ${reassign[0].modifiedCount} video(s), ` +
      `${reassign[1].modifiedCount} analysis(es), ${reassign[2].modifiedCount} report(s)`
  );

  console.log('\nSeed complete. Change passwords after first login!');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});