const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// mongoose.readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
router.get('/', (req, res) => {
  const state = mongoose && mongoose.connection ? mongoose.connection.readyState : 0;
  const messages = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  res.json({ mongoReady: state, status: messages[state] || 'unknown' });
});

module.exports = router;
