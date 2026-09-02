require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not set in environment. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const Profile = require('../models/Profile');
  const EmployersProfile = require('../models/employersProfile');

  const dryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';
  console.log('Dry run:', dryRun);

  let updated = 0;

  async function computeAndUpdate(model, query = {}) {
    const cursor = model.find(query).cursor();
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      // work on a plain object copy
      const obj = doc.toObject();
      if (obj.location && String(obj.location).trim().length) continue; // already has location

      const parts = [];
      // jobhunter style
      if (obj.addressLine) parts.push(obj.addressLine);
      if (obj.city) parts.push(obj.city);
      if (obj.stateprovince) parts.push(obj.stateprovince);
      if (obj.postalCode) parts.push(obj.postalCode);
      if (obj.country) parts.push(obj.country);

      // employers style
      if (parts.length === 0 && obj.companyStreetAddress) parts.push(obj.companyStreetAddress);
      if (obj.companyCity) parts.push(obj.companyCity);
      if (obj.companyRegion) parts.push(obj.companyRegion);
      if (obj.companyPostalCode) parts.push(obj.companyPostalCode);
      if (obj.companyCountry) parts.push(obj.companyCountry);

      if (parts.length === 0) continue; // nothing to build

      const location = parts.join(', ');
      console.log(`Would update ${model.modelName} ${doc._id} -> location: "${location}"`);
      if (!dryRun) {
        doc.location = location;
        try {
          await doc.save();
          updated++;
          console.log(`Updated ${model.modelName} ${doc._id}`);
        } catch (err) {
          console.error(`Failed to update ${model.modelName} ${doc._id}:`, err.message || err);
        }
      }
    }
  }

  console.log('Scanning Profile collection...');
  await computeAndUpdate(Profile);
  console.log('Scanning EmployersProfile collection...');
  await computeAndUpdate(EmployersProfile);

  console.log(`Done. Updated ${updated} documents.`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
