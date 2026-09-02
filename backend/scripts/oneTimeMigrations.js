// scripts/migrateCompanyLocation.js
require('dotenv').config();
const mongoose = require('mongoose');
const EmployersProfile = require('../models/employersProfile');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log('Connected to MongoDB');

  const profiles = await EmployersProfile.find({
    companyLocation: { $exists: true, $ne: '' },
    $or: [
      { companyCity: { $exists: false } },
      { companyCountry: { $exists: false } },
    ],
  });

  console.log(`Found ${profiles.length} profiles to migrate...`);

  for (const profile of profiles) {
    const parts = profile.companyLocation.split(',').map(p => p.trim());

    // Simple parsing heuristic (depends on your old format)
    profile.companyStreetAddress = profile.companyStreetAddress || parts[0] || '';
    profile.companyCity = profile.companyCity || parts[1] || '';
    profile.companyRegion = profile.companyRegion || parts[2] || '';
    profile.companyPostalCode = profile.companyPostalCode || parts[3] || '';
    profile.companyCountry = profile.companyCountry || parts[4] || '';

    try {
      await profile.save();
      console.log(`✅ Updated ${profile.companyName || '(unknown)'} (${profile._id})`);
    } catch (err) {
      console.error(`❌ Failed ${profile._id}:`, err.message);
    }
  }

  console.log('Migration complete ✅');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
