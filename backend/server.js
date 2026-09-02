const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require('http');
const { Server } = require('socket.io');
require("dotenv").config();

const app = express();  
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // frontend origin
    methods: ["GET", "POST"],
    credentials: true
  }
});
app.set('io', io);

io.on('connection', socket => {
  console.log('User connected', socket.id);

  socket.on('register', userId => {
    socket.join(userId);
    console.log(`User joined room: ${userId}`);
  });

  socket.on('disconnect', () => console.log('User disconnected'));
});


// allow forcing a dev fallback mode by setting SKIP_MONGO=1 (useful for local dev when .env exists)
if (process.env.SKIP_MONGO === '1' || process.env.SKIP_MONGO === 'true') {
  console.log('SKIP_MONGO set — running in dev fallback mode (no MongoDB).');
} else if (process.env.MONGO_URI) {
  // connect to MongoDB only when MONGO_URI is provided and SKIP_MONGO not set
  mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error('MongoDB connection error:', err));
} else {
  console.log('No MONGO_URI provided — running in dev fallback mode (no MongoDB).');
}

// test route
app.get("/", (req, res) => {
  res.send("WorkConnect backend running");
});

// profile routes
const profileRoutes = require('./routes/profile');
app.use('/api/profile', profileRoutes);

// uploads route & static serving
const uploadRoutes = require('./routes/uploads');
app.use('/api/uploads', uploadRoutes);
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

// verification (send/verify codes)
const verifyRoutes = require('./routes/verify');
app.use('/api/verify', verifyRoutes);

// auth routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);


// login route
const loginRoutes = require('./routes/login');
app.use('/api/login', loginRoutes);
// status route
const statusRoutes = require('./routes/status');
app.use('/api/status', statusRoutes);

// jobs route (list and create job posts)
const jobsRoutes = require('./routes/jobs');
app.use('/api/jobs', jobsRoutes);

// messages route
const messagesRoutes = require('./routes/messages');
app.use('/api/messages', messagesRoutes);

// applications route
const applicationsRoutes = require('./routes/applications');
app.use('/api/applications', applicationsRoutes);

const forgotPasswordRoutes = require('./routes/forgotPassword');
app.use('/api/forgot-password', forgotPasswordRoutes);

const notificationsRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationsRoutes);

const dashboardRoutes = require('./routes/dashboard');
app.use('/api/dashboard', dashboardRoutes);

// admin stats + analytics used by the admin dashboard
const adminStatsRoutes = require('./routes/adminStats');
app.use('/api/admin', adminStatsRoutes);

// admin users (combined jobseekers + employers)
const adminUsersRoutes = require('./routes/adminUsers');
app.use('/api/admin/users', adminUsersRoutes);

// merged user management route
const userManagementRoutes = require('./routes/UserManagementRoutes');
app.use('/api/admin/merged-users', userManagementRoutes);






const PORT = process.env.PORT || 5000;
// Start the HTTP server (attach Socket.IO to the same server instance)
// Start server once — Socket.IO is already attached to `server`
server.listen(PORT, () => console.log(`✅ Server + WebSocket running on port ${PORT}`));

// debug: print registered routes
function listRegisteredRoutes() {
  try {
    const routes = [];
    if (!app._router || !app._router.stack) return console.log('No routes registered yet');
    app._router.stack.forEach(mw => {
      if (mw.route && mw.route.path) {
        const methods = Object.keys(mw.route.methods).map(m => m.toUpperCase()).join(',');
        routes.push(`${methods} ${mw.route.path}`);
      } else if (mw.name === 'router' && mw.handle && mw.handle.stack) {
        mw.handle.stack.forEach(r => {
          if (r.route && r.route.path) {
            const methods = Object.keys(r.route.methods).map(m => m.toUpperCase()).join(',');
            routes.push(`${methods} ${r.route.path}`);
          }
        });
      }
    });
    console.log('Registered routes:\n' + routes.join('\n'));
  } catch (e) {
    console.error('Could not list routes', e);
  }
}
listRegisteredRoutes();