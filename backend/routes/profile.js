const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
let Profile;
try {
  Profile = require('../models/Profile');
} catch (e) {
  Profile = null;
}
let EmployersProfile;
try {
  EmployersProfile = require('../models/employersProfile');
} catch (e) {
  EmployersProfile = null;
}

// in-memory fallback store when MongoDB isn't connected (dev mode)
const inMemoryProfiles = new Map();
function isDbConnected() {
  // consider connected if mongoose connection is ready and at least one profile model is available
  return mongoose && mongoose.connection && mongoose.connection.readyState === 1 && (Profile || EmployersProfile);
}





router.get('/activities', (req, res) => {
  res.json({ activities: [] });
});

router.get('/completeness', (req, res) => {
  res.json({ completeness: 100 });
});


// create or update profile
router.post('/', auth, async (req, res) => {
  try {
    // prefer authenticated userId
    const authUserId = req.userId;
    const { email, userId } = req.body;
    const effectiveUserId = authUserId || userId;
    if (!email && !effectiveUserId) return res.status(400).json({ error: 'email or userId required' });

    if (!isDbConnected()) {
      // dev fallback: store in memory
      // support indexing by email and userId (and ownerEmail for employers) so GET by userId works
      const existing = (email && inMemoryProfiles.get(email)) || (effectiveUserId && inMemoryProfiles.get(effectiveUserId));
      const record = Object.assign({}, existing || {}, req.body, { createdAt: existing ? existing.createdAt : new Date() });
      if (email) inMemoryProfiles.set(email, record);
      if (effectiveUserId) inMemoryProfiles.set(effectiveUserId, record);
      if (req.body && req.body.ownerEmail) inMemoryProfiles.set(req.body.ownerEmail, record);
      return res.status(existing ? 200 : 201).json(record);
    }
    // Try to find existing profile in either model
    let profile = null;
    let usingEmployers = false;
    if (effectiveUserId) {
      if (Profile) profile = await Profile.findOne({ userId: effectiveUserId }); 
      if (!profile && EmployersProfile) {
        profile = await EmployersProfile.findOne({ userId: effectiveUserId });
        if (profile) usingEmployers = true;
      }
    }
    if (!profile && email) {
      if (Profile) profile = await Profile.findOne({ email });
      if (!profile && EmployersProfile) {
        // employer profiles store contact email in ownerEmail
        profile = await EmployersProfile.findOne({ ownerEmail: email });
        if (profile) usingEmployers = true;
      }
    }

    if (profile) {
  // merge incoming fields but ignore immutable/internal fields from client
  const safeBody = Object.assign({}, req.body);

  // 🧹 SANITIZE FIELDS — convert bad string fields to arrays or objects
  const arrayFields = ['education', 'experience', 'skills', 'languages', 'portfolio', 'certifications'];
  arrayFields.forEach(field => {
    if (typeof safeBody[field] === 'string') safeBody[field] = [];
    if (safeBody[field] === null || safeBody[field] === undefined) safeBody[field] = [];
  });

  // prevent clients from forcing _id or version (__v) which can trigger VersionError
  delete safeBody._id;
  delete safeBody.__v;
  delete safeBody.createdAt;
  delete safeBody.updatedAt;

  // apply sanitized fields
  Object.assign(profile, safeBody);
  if (effectiveUserId) profile.userId = effectiveUserId;

  await profile.save();
  return res.json(profile);
}


    // create new profile - choose model based on presence of employer-like fields
    const isEmployerPayload = !!(req.body.companyName || req.body.ownerEmail || req.body.companyWebsite);
    const Model = (EmployersProfile && isEmployerPayload) ? EmployersProfile : Profile;
    const newProfileData = Object.assign({}, req.body);
    if (effectiveUserId) newProfileData.userId = effectiveUserId;
    const created = new Model(newProfileData);
    await created.save();
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// get profile by userId or email
router.get('/', async (req, res) => {
  try {
    const { email, userId } = req.query;
    // attempt to extract userId from Authorization header if present
    let authUserId = req.userId; // may be set if auth middleware ran earlier
    const authHeader = req.headers && req.headers.authorization;
    if (!authUserId && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
        authUserId = decoded.userId;
      } catch (e) {
        // ignore invalid token here; we'll fallback to query params
      }
    }

  if (!email && !userId && !authUserId) return res.status(400).json({ error: 'email or userId query required' });

    if (!isDbConnected()) {
      // try multiple keys in dev fallback (email, userId, authUserId)
      const tryKeys = [];
      if (email) tryKeys.push(email);
      if (userId) tryKeys.push(userId);
      if (authUserId) tryKeys.push(authUserId);
      // also try ownerEmail variants when email not provided
      if (!email && userId) tryKeys.push(userId);
      let profile = null;
      for (const k of tryKeys) {
        profile = inMemoryProfiles.get(k);
        if (profile) break;
      }
      if (!profile) {
        // return a minimal skeleton profile so frontend always receives a usable object
        const skeleton = {
          userId: authUserId || userId || null,
          email: email || null,
          firstName: '',
          lastName: '',
          role: 'jobhunter',
          location: '',
          skills: [],
          languages: [],
          portfolio: [],
          certifications: [],
          education: [],
          experience: [],
        };
        return res.json(skeleton);
      }
      return res.json(profile);
    }

    // Try to find profile in either Profile or EmployersProfile collections
    let profile = null;
    // prefer authenticated userId
    if (authUserId) {
      if (Profile) profile = await Profile.findOne({ userId: authUserId });
      if (!profile && EmployersProfile) profile = await EmployersProfile.findOne({ userId: authUserId });
    }
    if (!profile && userId) {
      if (Profile) profile = await Profile.findOne({ userId });
      if (!profile && EmployersProfile) profile = await EmployersProfile.findOne({ userId });
    }
    if (!profile && email) {
      if (Profile) profile = await Profile.findOne({ email });
      if (!profile && EmployersProfile) profile = await EmployersProfile.findOne({ ownerEmail: email });
    }
    if (!profile) {
      // When no persisted profile exists, return a minimal skeleton so the frontend
      // always receives a consistent object to render and update.
      const skeleton = {
        userId: authUserId || userId || null,
        email: email || null,
        firstName: '',
        lastName: '',
        role: 'jobhunter',
        location: '',
        skills: [],
        languages: [],
        portfolio: [],
        certifications: [],
        education: [],
        experience: [],
        desiredJobType: null,
        workArrangement: null,
        preferredJobCategories: [],
        preferredLocation: null,
        careerLevelTarget: null,
      };
      return res.json(skeleton);
    }

    // Ensure we return a plain object and compute a friendly `location` string
    // when structured address fields exist but `location` (legacy single field)
    // is not present. This keeps frontend consumers (which expect `profile.location`)
    // working even when data is stored in separate fields.
    let out = (typeof profile.toObject === 'function') ? profile.toObject() : profile;
    if (!out.location) {
      const parts = [];
      // jobhunter profile fields
      if (out.addressLine) parts.push(out.addressLine);
      if (out.city) parts.push(out.city);
      if (out.stateprovince) parts.push(out.stateprovince);
      if (out.postalCode) parts.push(out.postalCode);
      if (out.country) parts.push(out.country);
      // employer profile fields (if present)
      if (parts.length === 0 && out.companyStreetAddress) parts.push(out.companyStreetAddress);
      if (out.companyCity) parts.push(out.companyCity);
      if (out.companyRegion) parts.push(out.companyRegion);
      if (out.companyPostalCode) parts.push(out.companyPostalCode);
      if (out.companyCountry) parts.push(out.companyCountry);
      if (parts.length > 0) out.location = parts.join(', ');
    }

    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// ✅ GET profile by userId via /api/profile/:id (used by Messages.js)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userType = req.query.userType || 'Profile';

    let profile = null;
    if (!isDbConnected()) {
      // Fallback for dev mode (in-memory)
      profile = inMemoryProfiles.get(id);
      if (!profile) return res.status(404).json({ error: 'Profile not found' });
      return res.json(profile);
    }

    if (userType === 'EmployersProfile') {
      profile = await EmployersProfile.findOne({ userId: id }).lean();
    } else {
      profile = await Profile.findOne({ userId: id }).lean();
    }

    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // 🧠 build location if not present
    if (!profile.location) {
      const parts = [];
      if (profile.companyCity) parts.push(profile.companyCity);
      if (profile.companyRegion) parts.push(profile.companyRegion);
      if (profile.companyCountry) parts.push(profile.companyCountry);
      if (parts.length > 0) profile.location = parts.join(', ');
    }

    res.json(profile);
  } catch (err) {
    console.error('Error fetching /api/profile/:id', err);
    res.status(500).json({ error: 'server error' });
  }
});



module.exports = router;
