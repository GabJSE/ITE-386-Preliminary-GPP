// Simple backfill script to add missing profile fields (run once)
// Usage: node backend/scripts/backfill_profile_documents.js

const mongoose = require('mongoose');
const Profile = require('../models/Profile');

const MONGO = process.env.MONGO_URL || 'mongodb://localhost:27017/workconnect';

async function run() {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to mongo');
  const cursor = Profile.find().cursor();
  let count = 0;
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    let changed = false;
    if (typeof doc.githubUrl === 'undefined') { doc.githubUrl = ''; changed = true; }
    if (!Array.isArray(doc.lettersOfRecommendation)) { doc.lettersOfRecommendation = []; changed = true; }
    if (!Array.isArray(doc.professionalLicenses)) { doc.professionalLicenses = []; changed = true; }
    if (typeof doc.resumeUrl === 'undefined') { doc.resumeUrl = ''; changed = true; }
    if (changed) {
      try {
        await doc.save();
        count++;
      } catch (e) {
        console.error('Failed to save doc', doc._id, e.message);
      }
    }
  }
  console.log('Backfill complete. Profiles updated:', count);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
