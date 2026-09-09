/**
 * Seed script: resets the users collection and seeds:
 *   - Admin   : rashmi@gmail.com / Rashmi@2007
 *   - Officer : rasika@gmail.com / Rasika@2006
 *   - Viewer  : none — table left empty. Anyone can login via username-only
 *               viewer login (account is auto-created) and view/download reports.
 * Existing videos / analyses / reports are re-linked to the new officer.
 * Run: node scripts/seed-sample-data.js   (or: npm run seed:sample)
 */
const mongoose = require('mongoose');
const env = require('../config/env');

const User = require('../models/User');
const Video = require('../models/Video');
const Analysis = require('../models/Analysis');
const Report = require('../models/Report');

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
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 15000 });
  console.log('Connected to MongoDB:', mongoose.connection.db.databaseName);

  const db = mongoose.connection.db;

  // --- 1. Collections ---
  const collections = ['users', 'videos', 'analyses', 'reports'];
  for (const name of collections) {
    const exists = await db.listCollections({ name }).hasNext();
    if (!exists) {
      await db.createCollection(name);
      console.log(`Created collection: ${name}`);
    }
  }

  // --- 2. Delete ALL existing users and re-seed from scratch ---
  const deleted = await User.deleteMany({});
  console.log(`Deleted ${deleted.deletedCount} user(s) from 'users'`);

  let adminUser, officerUser;
  for (const account of SAMPLE_USERS) {
    const user = await User.create(account);
    console.log(`Created ${account.role}: ${account.email}`);
    if (account.role === 'admin') adminUser = user;
    if (account.role === 'officer') officerUser = user;
  }

  // Viewers: table is intentionally EMPTY. Any username can login through the
  // viewer portal and the account is auto-created at first login.

  // --- 3. Re-link existing videos / analyses / reports to the new officer ---
  const reassign = await Promise.all([
    Video.updateMany({}, { uploadedBy: officerUser._id }),
    Analysis.updateMany({}, { requestedBy: officerUser._id }),
    Report.updateMany({}, { generatedBy: officerUser._id }),
  ]);
  console.log(
    `Re-linked data to officer ${officerUser.email}: ` +
      `${reassign[0].modifiedCount} video(s), ${reassign[1].modifiedCount} analysis(es), ${reassign[2].modifiedCount} report(s)`
  );

  console.log('\n==============================================');
  console.log('Seed complete.');
  console.log('==============================================');
  const counts = {};
  for (const name of collections) {
    counts[name] = await db.collection(name).countDocuments();
    console.log(`  ${name.padEnd(10)} -> ${counts[name]} documents`);
  }

  console.log('\nLogin accounts (email + password):');
  console.log('  admin   -> rashmi@gmail.com / Rashmi@2007  (role: admin)');
  console.log('  officer -> rasika@gmail.com / Rasika@2006  (role: officer)');
  console.log('  viewers -> NONE. Local people login with any username, no');
  console.log('             password, and can view/download reports.');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});