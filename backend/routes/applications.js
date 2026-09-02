const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Application = require('../models/Application');
let Job;
try { Job = require('../models/Job'); } catch (e) { Job = null; }
let Notification;
try { Notification = require('../models/Notification'); } catch (e) { Notification = null; }

// In-memory fallback when MongoDB is not configured (useful for local dev)
const isDevFallback = (!process.env.MONGO_URI) || process.env.SKIP_MONGO === '1' || process.env.SKIP_MONGO === 'true';
let _memApps = [];

// Submit application
router.post('/send', async (req, res) => {
  try {
    const data = req.body;
    // minimal validation
    if (!data.applicantId || !data.employerId || !data.jobId) return res.status(400).json({ error: 'Missing required fields' });

    // If we're in dev fallback mode (no Mongo), store in-memory
    if (isDevFallback) {
      // prevent duplicate applications in dev fallback
      const exists = _memApps.find(a => String(a.applicantId) === String(data.applicantId) && String(a.jobId) === String(data.jobId));
      if (exists) return res.status(409).json({ error: 'Application already exists' });
      const id = String(Date.now()) + '-' + Math.round(Math.random() * 1e9);
      const app = {
        _id: id,
        applicantId: data.applicantId,
        employerId: data.employerId,
        jobId: data.jobId,
        jobTitle: data.jobTitle,
        fullName: data.fullName,
        email: data.email,
        contactNumber: data.contactNumber,
        location: data.location,
        profilePictureUrl: data.profilePictureUrl,
        resumeUrl: data.resumeUrl,
        education: data.education || {},
        workExperience: data.workExperience || [],
        skills: data.skills || [],
        certificates: data.certificates || [],
        coverLetter: data.coverLetter,
        expectedSalary: data.expectedSalary,
        availability: data.availability,
        applicationDate: data.applicationDate ? new Date(data.applicationDate) : new Date(),
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      _memApps.unshift(app);
      // notify employer via socket (dev fallback)
      try {
        const io = req.app && req.app.get && req.app.get('io');
        if (io && app.employerId) {
          const note = { title: 'New application received', message: `${app.fullName || 'A candidate'} applied to ${app.jobTitle || 'your job'}`, link: `/employer/applicants?jobId=${app.jobId}`, createdAt: new Date() };
          io.to(String(app.employerId)).emit('notification', note);
        }
      } catch (e) { /* ignore */ }
      return res.json({ application: app });
    }

    // Prevent duplicate applications at the DB layer (applicant+job)
    try {
      const dup = await Application.findOne({ applicantId: data.applicantId, jobId: data.jobId }).lean();
      if (dup) return res.status(409).json({ error: 'Application already exists' });
    } catch (e) {
      // if the duplicate check fails for some reason, continue and rely on unique constraints if present
      console.warn('Duplicate check failed', e);
    }

    const app = new Application({
      applicantId: data.applicantId,
      employerId: data.employerId,
      jobId: data.jobId,
      jobTitle: data.jobTitle,
      fullName: data.fullName,
      email: data.email,
      contactNumber: data.contactNumber,
      location: data.location,
      profilePictureUrl: data.profilePictureUrl,
      resumeUrl: data.resumeUrl,
      education: data.education || {},
      workExperience: data.workExperience || [],
      skills: data.skills || [],
      certificates: data.certificates || [],
      coverLetter: data.coverLetter,
      expectedSalary: data.expectedSalary,
      availability: data.availability,
      applicationDate: data.applicationDate ? new Date(data.applicationDate) : new Date(),
      status: 'pending'
    });

    await app.save();
    // create a Notification for the employer if Notification model exists
    try {
      const io = req.app && req.app.get && req.app.get('io');
      if (Notification && app.employerId) {
        const note = new Notification({
          userId: app.employerId,
          userType: 'EmployersProfile',
          type: 'application',
          title: 'New application received',
          message: `${app.fullName || 'A candidate'} applied to ${app.jobTitle || 'your job'}`,
          link: `/employer/applicants?jobId=${app.jobId}`,
        });
        await note.save();
        // emit real-time notification via socket.io if available
        try { if (io) io.to(String(app.employerId)).emit('notification', note); } catch (e) { /* ignore */ }
      } else {
        // still emit a minimal socket event if io available
        try {
          const io2 = req.app && req.app.get && req.app.get('io');
          if (io2 && app.employerId) {
            io2.to(String(app.employerId)).emit('notification', { title: 'New application received', message: `${app.fullName || 'A candidate'} applied to ${app.jobTitle || 'your job'}`, link: `/employer/applicants?jobId=${app.jobId}`, createdAt: new Date() });
          }
        } catch (e) { /* ignore */ }
      }
    } catch (e) {
      console.warn('Failed to create/emit notification for application', e);
    }

    return res.json({ application: app });
  } catch (err) {
    console.error('Application send error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get applications for an employer
router.get('/employer/:employerId', async (req, res) => {
  try {
    const { employerId } = req.params;
    if (isDevFallback) {
      const apps = _memApps.filter(a => String(a.employerId) === String(employerId));
      apps.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json({ applications: apps });
    }
    const apps = await Application.find({ employerId }).sort({ createdAt: -1 }).lean();
    return res.json({ applications: apps });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/applicant/:applicantId', async (req, res) => {
  try {
    const { applicantId } = req.params;

    // Cast string to ObjectId if valid
    const id = mongoose.Types.ObjectId.isValid(applicantId)
      ? new mongoose.Types.ObjectId(applicantId)
      : null;

    if (!id) return res.status(400).json({ error: 'Invalid applicantId format' });

    const apps = await Application.find({ applicantId: id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ applications: apps });
  } catch (err) {
    console.error('Get applicant applications error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});



// Get application by id
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (isDevFallback) {
      const app = _memApps.find(a => String(a._id) === String(id));
      if (!app) return res.status(404).json({ error: 'Not found' });
      return res.json({ application: app });
    }
    const app = await Application.findById(id).lean();
    if (!app) return res.status(404).json({ error: 'Not found' });
    return res.json({ application: app });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Delete application by id (withdraw)
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    if (isDevFallback) {
      const idx = _memApps.findIndex(a => String(a._id) === String(id));
      if (idx === -1) return res.status(404).json({ error: 'Not found' });
      const [removed] = _memApps.splice(idx, 1);
      // optionally notify via socket if available
      try {
        const io = req.app && req.app.get && req.app.get('io');
        if (io && removed && removed.applicantId) io.to(String(removed.applicantId)).emit('application:removed', { applicationId: removed._id });
      } catch (e) { /* ignore */ }
      return res.json({ deleted: true });
    }

    const app = await Application.findById(id);
    if (!app) return res.status(404).json({ error: 'Not found' });
    await Application.deleteOne({ _id: id });

    // notify applicant/employer via socket if available
    try {
      const io = req.app && req.app.get && req.app.get('io');
      if (io) {
        if (app.applicantId) io.to(String(app.applicantId)).emit('application:removed', { applicationId: id });
        if (app.employerId) io.to(String(app.employerId)).emit('application:removed', { applicationId: id });
      }
    } catch (e) { /* ignore */ }

    return res.json({ deleted: true });
  } catch (err) {
    console.error('Delete application error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});


// Update application status (e.g. shortlist, rejected, hired)
router.put('/:id/status', async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const newStatus = body.status;
    if (!newStatus) return res.status(400).json({ error: 'Missing status' });

    // require auth for status changes
    const auth = req.headers && (req.headers.authorization || req.headers.Authorization);
    if (!auth) return res.status(401).json({ error: 'authorization required' });
    const parts = auth.split(' ');
    const token = parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1] : parts[0];
    const jwt = require('jsonwebtoken');
    let payload;
    try { payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret'); } catch (err) { return res.status(401).json({ error: 'invalid token' }); }
    const userId = payload && (payload.userId || payload.id || payload._id);
    if (!userId) return res.status(401).json({ error: 'invalid token payload' });

    if (isDevFallback) {
      const idx = _memApps.findIndex(a => String(a._id) === String(id));
      if (idx === -1) return res.status(404).json({ error: 'Not found' });
      // prevent reverting a hired application or changing statuses for a job already filled
      if (_memApps[idx].status === 'hired' && newStatus !== 'hired') return res.status(400).json({ error: 'Cannot change status of a hired application' });
      _memApps[idx].status = newStatus;

      // best-effort: if hired => try to mark job filled (skip if no Job model)
      if (newStatus === 'hired' && Job) {
        try {
          const job = await Job.findById(_memApps[idx].jobId).lean();
          if (job) {
            // count hired apps
            const hiredCount = _memApps.filter(a => String(a.jobId) === String(job._id) && a.status === 'hired').length;
            if (hiredCount >= (job.numberOpenings || 1)) {
              await Job.findByIdAndUpdate(job._id, { $set: { status: 'Filled' } });
              // mark others rejected in-memory
              _memApps = _memApps.map(a => {
                if (String(a.jobId) === String(job._id) && a.status !== 'hired') a.status = 'rejected';
                return a;
              });
            }
          }
        } catch (e) { console.warn('Dev fallback: job filled check failed', e); }
      }

      return res.json({ application: _memApps[idx] });
    }

    const app = await Application.findById(id);
    if (!app) return res.status(404).json({ error: 'Not found' });

    // Only allow employer who owns the job (createdBy) to change statuses — if job exists
    let jobDoc = null;
    if (Job && app.jobId) jobDoc = await Job.findById(app.jobId).lean();
    // If the job is already Filled, do not allow further status changes
    if (jobDoc && String(jobDoc.status).toLowerCase() === 'filled') {
      return res.status(400).json({ error: 'Job already filled; cannot change application statuses' });
    }
    // Prevent reverting a hired application
    if (String(app.status).toLowerCase() === 'hired' && String(newStatus).toLowerCase() !== 'hired') {
      return res.status(400).json({ error: 'Cannot change status of a hired application' });
    }
    if (jobDoc && jobDoc.createdBy && String(jobDoc.createdBy) !== String(userId)) {
      return res.status(403).json({ error: 'forbidden - not job owner' });
    }

    app.status = newStatus;
    await app.save();

    // create a notification for the applicant about their status change
    try {
      const io = req.app && req.app.get && req.app.get('io');
      if (Notification && app.applicantId) {
        let title = 'Application update';
        let message = `Your application status was updated to ${String(newStatus)}.`;
        if (String(newStatus).toLowerCase() === 'hired') {
          title = 'You were hired';
          message = `Congratulations — you were hired for the position ${app.jobTitle || ''}`;
        } else if (String(newStatus).toLowerCase() === 'rejected') {
          title = 'Application not selected';
          message = `Your application for ${app.jobTitle || ''} was not selected.`;
        }
        const note = new Notification({
          userId: app.applicantId,
          userType: 'JobseekerProfile',
          type: 'application',
          title,
          message,
          link: `/jobhunter/applications?jobId=${app.jobId}`,
        });
        try { await note.save(); } catch (e) { console.warn('Failed to save status notification', e); }
        try { if (io) io.to(String(app.applicantId)).emit('notification', note); } catch (e) { /* ignore */ }
      } else {
        // dev fallback: emit a minimal socket event if io available
        try {
          const io2 = req.app && req.app.get && req.app.get('io');
          if (io2 && app.applicantId) io2.to(String(app.applicantId)).emit('notification', { title: 'Application update', message: `Your application status is now ${String(newStatus)}`, link: `/jobhunter/applications?jobId=${app.jobId}`, createdAt: new Date() });
        } catch (e) { /* ignore */ }
      }
    } catch (e) {
      console.warn('Failed to create/emit notification for status change', e);
    }

    // If candidate was hired, check job's filled capacity
    let jobFilled = false;
    let rejectedCount = 0;
    let rejectedIds = [];
    if (newStatus === 'hired' && app.jobId && Job) {
      try {
        // count how many hired applications exist for this job
        const hiredCount = await Application.countDocuments({ jobId: String(app.jobId), status: 'hired' });
        const job = await Job.findById(app.jobId);
        if (job && hiredCount >= (job.numberOpenings || 1)) {
          job.status = 'Filled';
          await job.save();
          jobFilled = true;

          // mark remaining pending/shortlisted applications as rejected
          const r = await Application.updateMany({ jobId: String(app.jobId), _id: { $ne: app._id }, status: { $in: ['pending','shortlist'] } }, { $set: { status: 'rejected' } });
          rejectedCount = r ? r.modifiedCount || r.nModified || 0 : 0;
          if (r && r.n) {
            // Mongo older drivers
          }

          // fetch ids of rejected apps to inform frontend / notify users
          try {
            const rejectedDocs = await Application.find({ jobId: String(app.jobId), _id: { $ne: app._id }, status: 'rejected' }).select('_id applicantId email').lean();
            rejectedIds = rejectedDocs.map(d => d._id);

            // create notifications if Notification model exists and socket is available
            if (Notification) {
              const notes = rejectedDocs.map(d => ({
                userId: d.applicantId || null,
                title: 'Application closed',
                message: `The position for job "${job.title || job._id}" has been filled and your application was not selected.`,
                link: `/jobhunter/jobs?jobId=${job._id}`,
                createdAt: new Date()
              }));
              try { await Notification.insertMany(notes); } catch (e) { console.warn('Failed to insert notifications', e); }
            }
          } catch (e) { console.warn('Failed to collect rejected ids', e); }
        }
      } catch (e) {
        console.warn('Error checking job filled status', e);
      }
    }

    // emit socket events to interested parties if io available
    try {
      const io = req.app && req.app.get && req.app.get('io');
      if (io) {
        // notify applicant about their status change
        if (app.applicantId) io.to(String(app.applicantId)).emit('application:status', { applicationId: app._id, status: app.status });
        // notify employer (self) as confirmation
        if (app.employerId) io.to(String(app.employerId)).emit('application:status', { applicationId: app._id, status: app.status });
        if (jobFilled && app.jobId) io.to(`job:${String(app.jobId)}`).emit('job:filled', { jobId: app.jobId });
      }
    } catch (e) { /* ignore socket errors */ }

    return res.json({ application: app, jobFilled, rejectedCount, rejectedIds });
  } catch (err) {
    console.error('Update application status error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

