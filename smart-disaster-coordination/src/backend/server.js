require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const requestRoutes = require('./routes/requestRoutes');
const volunteerRoutes = require('./routes/volunteerRoutes');
const ngoRoutes = require('./routes/ngoRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', methods: ['GET', 'POST'] }
});

if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/ngo', ngoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Disaster Coordination API running', timestamp: new Date() });
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join-zone', (zone) => {
    socket.join(`zone-${zone}`);
    console.log(`Socket ${socket.id} joined zone-${zone}`);
  });

  socket.on('new-sos-request', (data) => {
    io.to(`zone-${data.zone}`).emit('sos-alert', data);
  });

  socket.on('join-request', (requestId) => {
    if (!requestId) return;
    socket.join(`request-${requestId}`);
  });

  socket.on('leave-request', (requestId) => {
    if (!requestId) return;
    socket.leave(`request-${requestId}`);
  });

  socket.on('volunteer-location-update', (data) => {
    if (!data?.requestId) return;
    io.to(`request-${data.requestId}`).emit('volunteer-location-update', data);
  });

  socket.on('request-status-update', (data) => {
    io.emit('status-changed', data);
    if (data?.requestId) {
      io.to(`request-${data.requestId}`).emit('request-status-update', data);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = { app, server };
