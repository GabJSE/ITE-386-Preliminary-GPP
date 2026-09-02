// Migration: link existing profiles to users by matching email
// Run this script with: node migrations/link_profiles_by_email.js

const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const User = require('../models/User');
const Profile = require('../models/Profile');

async function run() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not set in backend/.env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB for migration');

  const users = await User.find({});
  console.log('Found', users.length, 'users');
  let updated = 0;

  for (const user of users) {
    const profile = await Profile.findOne({ email: user.email });
    if (profile && !profile.userId) {
      profile.userId = user._id;
      await profile.save();
      updated++;
      console.log('Linked profile for', user.email);
    }
  }

  console.log('Migration complete. Updated', updated, 'profiles');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
