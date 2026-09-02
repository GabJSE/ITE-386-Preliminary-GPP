const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
let Application;
try { Application = require('../models/Application'); } catch (e) { Application = null; }
let Notification;
try { Notification = require('../models/Notification'); } catch (e) { Notification = null; }

// GET /api/jobs - list jobs (most recent first)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query && req.query.createdBy) {
      // allow passing a user id to filter jobs created by that user
      filter.createdBy = req.query.createdBy;
    }
    // First: auto-close jobs whose deadline/expiration has passed
    try {
      const now = new Date();
      // find jobs that have a deadline/applicationDeadline/expirationDate before now and are still Active
      const expiredFilter = {
        $and: [
          filter,
          { status: { $ne: 'Closed' } },
          { $or: [
            { deadline: { $lt: now } },
            { applicationDeadline: { $lt: now } },
            { expirationDate: { $lt: now } }
          ] }
        ]
      };
      // fetch the list of jobs that will be closed so we can notify owner and applicants
      const expiredJobs = await Job.find(expiredFilter).lean();
      // update them to Closed
      if (expiredJobs && expiredJobs.length) {
        try { await Job.updateMany(expiredFilter, { $set: { status: 'Closed' } }); } catch (e) { console.warn('Failed to update expired jobs status', e); }

        // create notifications for each expired job: notify employer and applicants
        try {
          const io = req.app && req.app.get && req.app.get('io');
          for (const job of expiredJobs) {
            try {
              if (Notification && job.createdBy) {
                const employerNote = new Notification({
                  userId: job.createdBy,
                  userType: 'EmployersProfile',
                  type: 'expiration',
                  title: 'Job expired / closed',
                  message: `Your job "${job.title || 'Untitled'}" has closed due to deadline/expiration.`,
                  link: `/employer/JobPosting?selected=${job._id}`,
                });
                await employerNote.save();
                try { if (io) io.to(String(job.createdBy)).emit('notification', employerNote); } catch (e) { /* ignore */ }
              } else {
                try { if (io && job.createdBy) io.to(String(job.createdBy)).emit('notification', { title: 'Job expired', message: `Your job "${job.title || ''}" has closed.`, link: `/employer/JobPosting?selected=${job._id}`, createdAt: new Date() }); } catch (e) { /* ignore */ }
              }

              // notify applicants that job is closed
              if (Application) {
                const apps = await Application.find({ jobId: String(job._id) }).select('applicantId').lean();
                if (apps && apps.length) {
                  const notes = apps.map(a => ({
                    userId: a.applicantId || null,
                    userType: 'JobseekerProfile',
                    type: 'closed',
                    title: 'Position closed',
                    message: `The position "${job.title || ''}" has been closed/expired.`,
                    link: `/jobhunter/jobs?jobId=${job._id}`,
                    createdAt: new Date()
                  }));
                  if (Notification) {
                    let inserted = null;
                    try { inserted = await Notification.insertMany(notes); } catch (e) { console.warn('Failed to insert applicant notifications for expired job', e); }
                    try {
                      if (io && inserted && inserted.length) {
                        inserted.forEach(n => { try { if (n && n.userId) io.to(String(n.userId)).emit('notification', n); } catch (e) { /* ignore */ } });
                      } else if (io) {
                        // fallback: emit minimal events for each applicant
                        apps.forEach(a => { try { if (a && a.applicantId) io.to(String(a.applicantId)).emit('notification', { title: 'Position closed', message: `The position "${job.title || ''}" has been closed.`, link: `/jobhunter/jobs?jobId=${job._id}`, createdAt: new Date() }); } catch (e) { /* ignore */ } });
                      }
                    } catch (e) { /* ignore */ }
                  } else {
                    // no Notification model - still emit minimal events
                    try { if (io) apps.forEach(a => { if (a && a.applicantId) io.to(String(a.applicantId)).emit('notification', { title: 'Position closed', message: `The position "${job.title || ''}" has been closed.`, link: `/jobhunter/jobs?jobId=${job._id}`, createdAt: new Date() }); }); } catch (e) { /* ignore */ }
                  }
                }
              }
            } catch (e) { console.warn('Failed to notify about expired job', job._id, e); }
          }
        } catch (e) { console.warn('Failed to process expired job notifications', e); }
      }
    } catch (e) {
      // non-fatal: log and continue
      console.warn('Failed to auto-close expired jobs', e);
    }

    let jobs = await Job.find(filter).sort({ postedAt: -1 }).lean();

    // attach applicantsCount if Application model is available
    if (Application && Array.isArray(jobs) && jobs.length > 0) {
      try {
        const jobIds = jobs.map(j => String(j._id || j.id));
        // aggregate application counts per jobId
        const counts = await Application.aggregate([
          { $match: { jobId: { $in: jobIds } } },
          { $group: { _id: '$jobId', count: { $sum: 1 } } }
        ]);
        const countMap = {};
        (counts || []).forEach(c => { countMap[String(c._id)] = c.count; });
        jobs = jobs.map(j => ({ ...j, applicantsCount: countMap[String(j._id || j.id)] || 0 }));
      } catch (e) {
        console.warn('Failed to aggregate application counts for jobs', e);
        // fall back to jobs without applicantsCount
      }
    }

    res.json(jobs);
  } catch (e) {
    console.error('Error fetching jobs', e);
    res.status(500).json({ error: 'could not fetch jobs' });
  }
});

// POST /api/jobs - create a new job
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    // helper to accept either array or comma-separated string
    const toArray = (v) => {
      if (!v) return [];
      if (Array.isArray(v)) return v;
      if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean);
      return [];
    };

    const job = new Job({
      createdBy: body.createdBy,
      title: body.title,
      company: body.company,
      location: body.location,
      type: body.type,
      minSalary: body.minSalary,
      maxSalary: body.maxSalary,
      currency: body.currency,
  salaryFrequency: body.salaryFrequency,
      logoName: body.logoName,
      logoUrl: body.logoUrl,
      summary: body.summary,
      description: body.description,
  // deadlines and classification
  deadline: body.deadline || body.applicationDeadline || null,
  applicationDeadline: body.applicationDeadline || body.deadline || null,
  expirationDate: body.expirationDate || null,
  status: body.status || 'Active',
  category: body.category || null,
      responsibilities: toArray(body.responsibilities),
      requirements: toArray(body.requirements),
      preferred: body.preferred || '',
      skills: toArray(body.skills),
      experienceLevel: body.experienceLevel || '',
      educationLevel: body.educationLevel || '',
      benefits: toArray(body.benefits),
      numberOpenings: body.numberOpenings || 1,
      applicationMethod: body.applicationMethod || '',
      applicationTarget: body.applicationTarget || '',
      city: body.city || null,
      stateOrProvince: body.stateOrProvince || body.state || null,
      country: body.country || null,
      numberOpenings: body.numberOpenings,
      applicationMethod: body.applicationMethod,
      applicationTarget: body.applicationTarget,
      postedAt: body.postedAt || Date.now(),
  // expirationDate handled above
      easyApply: !!body.easyApply,
      isRemote: !!body.isRemote,
      isHybrid: !!body.isHybrid,
      isFullTime: !!body.isFullTime,
      exclusive: !!body.exclusive,
    });
    const saved = await job.save();
    // create a confirmation notification for the employer that the job was posted
    try {
      const io = req.app && req.app.get && req.app.get('io');
      if (Notification && saved && saved.createdBy) {
        const note = new Notification({
          userId: saved.createdBy,
          userType: 'EmployersProfile',
          type: 'job',
          title: 'Job posted',
          message: `Your job "${saved.title || 'Untitled'}" was posted successfully.`,
          link: `/employer/JobPosting?selected=${saved._id}`,
        });
        try { await note.save(); } catch (e) { console.warn('Failed to save job-post notification', e); }
        try { if (io) io.to(String(saved.createdBy)).emit('notification', note); } catch (e) { /* ignore */ }
      }
    } catch (e) { console.warn('Failed to create/emit job-post notification', e); }

    res.status(201).json(saved);
  } catch (e) {
    console.error('Error creating job', e);
    res.status(500).json({ error: 'could not create job' });
  }
});

// PUT /api/jobs/:id - update an existing job
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    // verify auth token and extract userId
    const auth = req.headers && (req.headers.authorization || req.headers.Authorization);
    if (!auth) return res.status(401).json({ error: 'authorization required' });
    const parts = auth.split(' ');
    const token = parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1] : parts[0];
    const jwt = require('jsonwebtoken');
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    } catch (err) {
      return res.status(401).json({ error: 'invalid token' });
    }

    const userId = payload && (payload.userId || payload.id || payload._id);
    if (!userId) return res.status(401).json({ error: 'invalid token payload' });

    // ensure job exists and belongs to this user
    const existing = await Job.findById(id).lean();
    if (!existing) return res.status(404).json({ error: 'job not found' });
    if (!existing.createdBy || String(existing.createdBy) !== String(userId)) {
      return res.status(403).json({ error: 'forbidden - not job owner' });
    }

    const body = req.body || {};
    // helper to accept either array or comma-separated / newline-separated string
    const toArray = (v) => {
      if (!v) return [];
      if (Array.isArray(v)) return v;
      if (typeof v === 'string') return v.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
      return [];
    };

    const update = { ...body };
    // convert date strings to real Date objects
    if (body.deadline !== undefined) {
      update.applicationDeadline = body.deadline ? new Date(body.deadline) : null;
      update.deadline = body.deadline ? new Date(body.deadline) : null;
    }
    // If applicationDeadline is provided (even null), update deadline to match
    else if (body.applicationDeadline !== undefined) {
      update.deadline = body.applicationDeadline ? new Date(body.applicationDeadline) : null;
      update.applicationDeadline = body.applicationDeadline ? new Date(body.applicationDeadline) : null;
    }

    // Handle expirationDate
    if (body.expirationDate !== undefined) {
      update.expirationDate = body.expirationDate ? new Date(body.expirationDate) : null;
    }
    // normalize list fields if present
    if (body.responsibilities !== undefined) update.responsibilities = toArray(body.responsibilities);
    if (body.requirements !== undefined) update.requirements = toArray(body.requirements);
    if (body.skills !== undefined) update.skills = toArray(body.skills);
    if (body.benefits !== undefined) update.benefits = toArray(body.benefits);
    // prevent changing _id and createdBy
    delete update._id;
    delete update.createdBy;
    console.log('Reposting update payload:', update);
    const updated = await Job.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!updated) return res.status(404).json({ error: 'job not found after update' });
    res.json(updated);
  } catch (e) {
    console.error('Error updating job', e);
    res.status(500).json({ error: 'could not update job' });
  }
});

// DELETE /api/jobs/:id - delete job and cascade cleanup (applications, notifications)
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    // verify auth token and extract userId (same pattern as PUT)
    const auth = req.headers && (req.headers.authorization || req.headers.Authorization);
    if (!auth) return res.status(401).json({ error: 'authorization required' });
    const parts = auth.split(' ');
    const token = parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1] : parts[0];
    const jwt = require('jsonwebtoken');
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    } catch (err) {
      return res.status(401).json({ error: 'invalid token' });
    }
    const userId = payload && (payload.userId || payload.id || payload._id);
    const userRole = payload && payload.role; // <-- ADD THIS
    if (!userId) return res.status(401).json({ error: 'invalid token payload' });

    const existing = await Job.findById(id).lean();
    if (!existing) return res.status(404).json({ error: 'job not found' });

    // --- NEW PERMISSION LOGIC ---
    // Skip ownership check if the user is an admin
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      if (!existing.createdBy || String(existing.createdBy) !== String(userId)) {
        return res.status(403).json({ error: 'forbidden - not job owner' });
      }
    }
    // --- END OF NEW LOGIC ---

    // delete the job
    await Job.findByIdAndDelete(id);

    // cascade: remove applications for this job (if Application model available)
    let removedApplications = 0;
    if (Application) {
      try {
        const r = await Application.deleteMany({ jobId: String(id) });
        removedApplications = r && r.deletedCount ? r.deletedCount : 0;
      } catch (e) {
        console.warn('Failed to delete applications for job', id, e);
      }
    }

    // cascade: remove notifications referencing this job id in link (best-effort)
    let removedNotifications = 0;
    if (Notification) {
      try {
        // delete notifications where link contains the job id (simple heuristic)
        const r2 = await Notification.deleteMany({ link: { $regex: String(id) } });
        removedNotifications = r2 && r2.deletedCount ? r2.deletedCount : 0;
      } catch (e) {
        console.warn('Failed to delete notifications for job', id, e);
      }
    }

    return res.json({ success: true, removedApplications, removedNotifications });
  } catch (e) {
    console.error('Error deleting job', e);
    res.status(500).json({ error: 'could not delete job' });
  }
});

module.exports = router;

