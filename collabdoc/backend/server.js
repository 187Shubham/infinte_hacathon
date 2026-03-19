require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const { Document } = require('./models/Document');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/collabdoc';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err.message));

// Track active users per document
const documentUsers = {}; // { docId: { socketId: { userId, username, color } } }

const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#82E0AA', '#F0B27A'
];

// JWT middleware for Socket.IO
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_prod');
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.user.username} (${socket.id})`);

  // Join a document room
  socket.on('join-document', async ({ documentId }) => {
    try {
      const doc = await Document.findById(documentId);
      if (!doc) return socket.emit('error', { message: 'Document not found' });

      // Check access
      const hasAccess =
        doc.owner.toString() === socket.user.id ||
        doc.collaborators.some(c => c.toString() === socket.user.id) ||
        doc.isPublic;

      if (!hasAccess) return socket.emit('error', { message: 'Access denied' });

      socket.join(documentId);

      // Track user
      if (!documentUsers[documentId]) documentUsers[documentId] = {};
      const colorIndex = Object.keys(documentUsers[documentId]).length % USER_COLORS.length;
      documentUsers[documentId][socket.id] = {
        userId: socket.user.id,
        username: socket.user.username,
        color: USER_COLORS[colorIndex],
        cursor: null,
      };

      // Send document content to joining user
      socket.emit('load-document', {
        content: doc.content,
        title: doc.title,
        version: doc.version,
      });

      // Notify others
      const activeUsers = Object.values(documentUsers[documentId]);
      io.to(documentId).emit('users-update', activeUsers);

      console.log(`📄 ${socket.user.username} joined doc: ${documentId}`);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // Handle text changes
  socket.on('send-changes', ({ documentId, delta, content }) => {
    socket.to(documentId).emit('receive-changes', { delta, content, userId: socket.user.id });
  });

  // Handle cursor position
  socket.on('cursor-move', ({ documentId, cursor }) => {
    if (documentUsers[documentId]?.[socket.id]) {
      documentUsers[documentId][socket.id].cursor = cursor;
    }
    socket.to(documentId).emit('cursor-update', {
      userId: socket.user.id,
      username: socket.user.username,
      color: documentUsers[documentId]?.[socket.id]?.color,
      cursor,
    });
  });

  // Save document
  socket.on('save-document', async ({ documentId, content, title }) => {
    try {
      const doc = await Document.findById(documentId);
      if (!doc) return;

      // Save version snapshot before updating
      doc.versions.push({
        content: doc.content,
        savedAt: new Date(),
        savedBy: socket.user.id,
        versionNumber: doc.version,
      });

      // Keep only last 20 versions
      if (doc.versions.length > 20) {
        doc.versions = doc.versions.slice(-20);
      }

      doc.content = content;
      doc.title = title || doc.title;
      doc.version += 1;
      doc.lastModified = new Date();
      doc.lastModifiedBy = socket.user.id;

      await doc.save();

      io.to(documentId).emit('document-saved', {
        version: doc.version,
        savedAt: doc.lastModified,
        savedBy: socket.user.username,
      });

      console.log(`💾 Doc saved: ${documentId} v${doc.version} by ${socket.user.username}`);
    } catch (err) {
      socket.emit('error', { message: 'Failed to save document' });
    }
  });

  // Revert to version
  socket.on('revert-version', async ({ documentId, versionNumber }) => {
    try {
      const doc = await Document.findById(documentId);
      if (!doc) return;

      const targetVersion = doc.versions.find(v => v.versionNumber === versionNumber);
      if (!targetVersion) return socket.emit('error', { message: 'Version not found' });

      // Save current as a version
      doc.versions.push({
        content: doc.content,
        savedAt: new Date(),
        savedBy: socket.user.id,
        versionNumber: doc.version,
        isRevertSnapshot: true,
      });

      doc.content = targetVersion.content;
      doc.version += 1;
      doc.lastModified = new Date();

      await doc.save();

      io.to(documentId).emit('document-reverted', {
        content: doc.content,
        version: doc.version,
        revertedTo: versionNumber,
      });
    } catch (err) {
      socket.emit('error', { message: 'Failed to revert version' });
    }
  });

  // Handle disconnect
  socket.on('disconnecting', () => {
    socket.rooms.forEach(room => {
      if (room !== socket.id && documentUsers[room]) {
        delete documentUsers[room][socket.id];
        const activeUsers = Object.values(documentUsers[room]);
        if (activeUsers.length === 0) {
          delete documentUsers[room];
        } else {
          io.to(room).emit('users-update', activeUsers);
        }
      }
    });
    console.log(`🔌 Disconnected: ${socket.user.username}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
