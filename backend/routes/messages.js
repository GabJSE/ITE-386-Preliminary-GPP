const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const Job = require('../models/Job');
const EmployersProfile = require('../models/employersProfile');
const Notification = require('../models/Notification');

function oppositeType(t) {
  return t === 'Profile' ? 'EmployersProfile' : 'Profile';
}

async function findConversationByPair(a, b) {
  return Conversation.findOne({
    participants: {
      $all: [
        { $elemMatch: { userId: a.userId, userType: a.userType } },
        { $elemMatch: { userId: b.userId, userType: b.userType } },
      ],
    },
  });
}

// GET all messages for a conversation
router.get('/conversation/:id/messages', auth, async (req, res) => {
  try {
    const messages = await Message.find({ conversationId: req.params.id })
      .sort({ createdAt: 1 })
      .lean();
    res.json({ messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/messages/:id', auth, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id).lean();
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    res.json(msg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const rawUserId = req.query.userId || req.userId;
    const userType = req.query.userType || req.userType;

    if (!rawUserId || !userType)
      return res.status(400).json({ error: 'userId and userType required' });

    let userId;
    try {
      userId = new mongoose.Types.ObjectId(rawUserId);
    } catch {
      userId = rawUserId;
    }

    const archived = req.query.archived === 'true';

    const participantPairs = [
      [{ userId, userType: 'Profile' }, { userType: 'EmployersProfile' }],
      [{ userId, userType: 'EmployersProfile' }, { userType: 'Profile' }],
    ];

    const baseQuery = {
      $or: participantPairs.map(pair => ({
        participants: { $all: pair.map(p => ({ $elemMatch: p })) }
      })),
      deletedBy: { $not: { $elemMatch: { userId, userType } } } // <-- exclude deleted conversations
    };

    // Handle archived filter
    if (archived) {
      baseQuery.archivedBy = { $elemMatch: { userId, userType } };
    } else {
      baseQuery.$and = [
        {
          $or: [
            { archivedBy: { $exists: false } },
            { archivedBy: { $not: { $elemMatch: { userId, userType } } } }
          ]
        }
      ];
    }

    let convos = await Conversation.find(baseQuery)
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean();

    res.json({ conversations: convos });
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// SEND a message
router.post('/send', auth, async (req, res) => {
  try {
    const from = req.userId;
    const providedFromType = req.userType || req.body.fromType;
    const providedToType = req.body.toType;
    const { conversationId, to, body, title } = req.body;

    if (!from || !to || !body) return res.status(400).json({ error: 'from, to, and body required' });

    const fromId = from;
    const toId = to;

    const preferredFromType = providedFromType || 'Profile';
    const preferredToType = providedToType || oppositeType(preferredFromType);

    const candidatePairs = [{ fromType: preferredFromType, toType: preferredToType }];
    if (preferredFromType === preferredToType) {
      const alt = oppositeType(preferredFromType);
      candidatePairs.push({ fromType: preferredFromType, toType: alt }, { fromType: alt, toType: preferredToType });
    }
    const strictOpp = { fromType: oppositeType(preferredFromType), toType: oppositeType(preferredToType) };
    if (!candidatePairs.some(c => c.fromType === strictOpp.fromType && c.toType === strictOpp.toType)) candidatePairs.push(strictOpp);

    let convo = null;
    for (const p of candidatePairs) {
      convo = await findConversationByPair({ userId: fromId, userType: p.fromType }, { userId: toId, userType: p.toType });
      if (convo) break;
    }

    if (!convo) {
      let created = null;
      let lastErr = null;
      for (const p of candidatePairs) {
        try {
          created = new Conversation({
            title: title || '',
            participants: [
              { userId: fromId, userType: p.fromType },
              { userId: toId, userType: p.toType },
            ],
          });
          await created.save();
          convo = created;
          break;
        } catch (err) {
          lastErr = err;
        }
      }
      if (!convo) return res.status(500).json({ error: 'Failed to create conversation' });
    }

    // Unarchive / undelete for sender
    convo.archivedBy = (convo.archivedBy || []).filter(a => String(a.userId) !== String(fromId));
    convo.deletedBy = (convo.deletedBy || []).filter(d => String(d.userId) !== String(fromId));
    await convo.save();

    const partA = convo.participants[0];
    const partB = convo.participants[1];
    const findParticipantType = (id) => {
      const sid = String(id);
      if (partA && String(partA.userId) === sid) return partA.userType;
      if (partB && String(partB.userId) === sid) return partB.userType;
      return 'Profile';
    };

    const finalFromType = findParticipantType(fromId);
    const finalToType = findParticipantType(toId);

    const msg = new Message({
      conversationId: convo._id,
      from: fromId,
      fromType: finalFromType,
      to: toId,
      toType: finalToType,
      body,
    });
    await msg.save();

    convo.lastMessage = body;
    convo.updatedAt = new Date();
    await convo.save();

    const io = req.app.get('io');
    if (io) {
      io.to(String(toId)).emit('newMessage', msg);
      io.to(String(fromId)).emit('newMessage', msg);
    }

    res.status(201).json({ conversation: convo, message: msg });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// START conversation (ensure job title is saved correctly, update existing convo if jobId provided)
router.post('/start', auth, async (req, res) => {
  try {
    const from = req.userId;
    const { to, title, jobId } = req.body;
    if (!from || !to) return res.status(400).json({ error: 'Missing from/to fields' });

    const preferredFromType = req.userType || req.body.fromType || 'Profile';
    const preferredToType = req.body.toType || oppositeType(preferredFromType);

    // Fetch the job title directly if jobId is provided
    let jobTitle = title;
    if (jobId) {
      const job = await Job.findById(jobId).select('title');
      if (job && job.title) jobTitle = job.title;
    }

    let convo = await findConversationByPair(
      { userId: from, userType: preferredFromType },
      { userId: to, userType: preferredToType }
    );

    if (!convo) {
      convo = new Conversation({
        title: jobTitle || title || '',
        jobId: jobId || null,
        participants: [
          { userId: from, userType: preferredFromType },
          { userId: to, userType: preferredToType },
        ],
      });
      await convo.save();
    } else {
      // --- IMPORTANT FIX: if convo already exists but we provided jobId, update it.
      let changed = false;
      if (jobId && (!convo.jobId || String(convo.jobId) !== String(jobId))) {
        convo.jobId = jobId;
        changed = true;
      }
      // If we were able to fetch a jobTitle and convo.title is empty or looks like applicant name (heuristic), update it.
      if (jobTitle) {
        // basic heuristic: if convo.title equals the provided `title` (which sometimes is the applicant name),
        // or if convo.title is empty, replace it with jobTitle.
        if (!convo.title || convo.title.trim() === '' || convo.title === title) {
          convo.title = jobTitle;
          changed = true;
        }
      }
      if (changed) await convo.save();
    }

    // Reset archived/deleted flags for starter
    convo.archivedBy = convo.archivedBy || [];
    convo.deletedBy = convo.deletedBy || [];
    // We don't wipe them here; calling user should unarchive/undelete only for themselves (server-side already handles unarchive in send)
    await convo.save();

    res.json({ conversationId: convo._id, conversation: convo });
  } catch (err) {
    console.error('Error starting conversation:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Archive/unarchive
router.patch('/conversations/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { archived } = req.body;
    const userId = req.userId;
    const userType = req.userType;
    if (typeof archived === 'undefined') return res.status(400).json({ error: 'archived boolean required' });

    const convo = await Conversation.findById(id);
    if (!convo) return res.status(404).json({ error: 'conversation not found' });

    convo.archivedBy = convo.archivedBy || [];
    const exists = convo.archivedBy.some(a => String(a.userId) === String(userId) && a.userType === userType);

    if (archived && !exists) convo.archivedBy.push({ userId, userType });
    else if (!archived && exists) convo.archivedBy = convo.archivedBy.filter(a => !(String(a.userId) === String(userId) && a.userType === userType));

    await convo.save();
    res.json({ conversation: convo });
  } catch (err) {
    console.error('Error archiving conversation:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE conversation completely (hard delete + notify job seeker)
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.userId; // current logged-in user (Employer)
    const userType = req.userType;
    const conversationId = req.params.id;

    // Only Employers can delete chats
    if (userType !== 'EmployersProfile') {
      return res.status(403).json({ message: 'Only employers can delete chats.' });
    }

    const convo = await Conversation.findById(conversationId);
    if (!convo) return res.status(404).json({ message: 'Conversation not found' });

    // Debugging: log convo metadata so you can inspect what's stored
    console.log('Deleting convo:', {
      conversationId,
      convoTitle: convo.title,
      jobId: convo.jobId ? String(convo.jobId) : null,
      participants: convo.participants,
    });

    // Identify job seeker
    const jobSeeker = convo.participants.find(p => p.userType === 'Profile');

    // Fetch employer info
    const employerProfile = await EmployersProfile.findOne({ userId });
    const employerName = employerProfile?.ownerName || 'Employer';
    const companyName = employerProfile?.companyName || 'a company';

// ✅ Fetch related job title (most accurate approach)
let jobTitle = null;

// --- 1️⃣ Try direct jobId reference
if (convo.jobId) {
  const job = await Job.findById(convo.jobId).select('title');
  if (job?.title) jobTitle = job.title;
}

// --- 2️⃣ Try Application lookup if jobId is missing
if (!jobTitle) {
  try {
    const Application = require('../models/Application');
    const employerId = convo.participants.find(p => p.userType === 'EmployersProfile')?.userId;
    const jobSeekerId = convo.participants.find(p => p.userType === 'Profile')?.userId;

    if (employerId && jobSeekerId) {
      const app = await Application.findOne({
        applicantId: jobSeekerId,
        employerId: employerId,
      }).populate('jobId', 'title');

      if (app?.jobId?.title) jobTitle = app.jobId.title;
    }
  } catch (e) {
    console.warn('Application lookup failed:', e.message);
  }
}

// --- 3️⃣ Fallback to convo.title if nothing else
if (!jobTitle && convo.title?.trim()) {
  jobTitle = convo.title.trim();
}

// --- 4️⃣ Final fallback
if (!jobTitle) jobTitle = 'a position';


    const message = `${employerName} from ${companyName} hiring for "${jobTitle}" has closed the chat.`;

    // Send notification to job seeker
    if (jobSeeker?.userId) {
      const notification = new Notification({
        userId: jobSeeker.userId,
        userType: 'Profile',
        type: 'custom',
        title: 'Chat Closed',
        message,
        link: `/messages`,
      });
      await notification.save();

      const io = req.app.get('io');
      if (io) {
        io.to(jobSeeker.userId.toString()).emit('notification', notification);
        io.to(jobSeeker.userId.toString()).emit('conversationDeleted', {
          conversationId,
          message: 'Chat closed by employer',
        });
      }
    }

    // Delete messages and conversation
    await Message.deleteMany({ conversationId });
    await Conversation.deleteOne({ _id: conversationId });

    // Notify employer side too
    const io = req.app.get('io');
    if (io) {
      io.to(userId.toString()).emit('conversationDeleted', {
        conversationId,
        message: 'You closed this chat',
      });
    }

    return res.json({ success: true, conversationId });
  } catch (err) {
    console.error('❌ Error deleting conversation:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Mark message as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const updated = await Message.findOneAndUpdate(
      { _id: req.params.id, to: req.userId },
      { read: true },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Message not found' });
    res.json(updated);
  } catch (err) {
    console.error('Error marking message as read:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
