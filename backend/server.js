import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import messageRoutes from './routes/messages.js';
import userRoutes from './routes/users.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

// Socket.IO connection handling
const onlineUsers = new Map();

io.on('connection', (socket) => {
  socket.on('user_connected', (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit('users_online', Array.from(onlineUsers.keys()));
  });

  socket.on('send_message', async (data) => {
    const recipientSocketId = onlineUsers.get(data.recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('receive_message', data);
    }
  });

  socket.on('disconnect', () => {
    let disconnectedUser;
    for (const [key, value] of onlineUsers.entries()) {
      if (value === socket.id) {
        disconnectedUser = key;
        break;
      }
    }
    if (disconnectedUser) {
      onlineUsers.delete(disconnectedUser);
      io.emit('users_online', Array.from(onlineUsers.keys()));
    }
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});