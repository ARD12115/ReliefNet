import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import User from '../models/User.js';

class SocketService {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // userId -> Set of socket IDs
    this.campRooms = new Map(); // campId -> Set of socket IDs
    this.roleRooms = {
      admin: new Set(),
      dispatcher: new Set(),
      coordinator: new Set()
    };
  }

  initialize(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.userId);
        
        if (!user || !user.isActive) {
          return next(new Error('User not found or deactivated'));
        }

        socket.user = user;
        socket.userId = user.id.toString();
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    console.log('Socket.IO server initialized');
    return this.io;
  }

  handleConnection(socket) {
    const userId = socket.userId;
    const user = socket.user;

    // Track user sockets
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socket.id);

    // Join role-based room
    this.roleRooms[user.role].add(socket.id);
    socket.join(`role:${user.role}`);

    // Join camp room if coordinator
    if (user.role === 'coordinator' && user.campId) {
      this.joinCampRoom(socket, user.campId.toString());
    }

    console.log(`User connected: ${user.name} (${user.role}) - ${socket.id}`);

    // Handle events
    socket.on('joinCamp', (campId) => {
      this.joinCampRoom(socket, campId);
    });

    socket.on('leaveCamp', (campId) => {
      this.leaveCampRoom(socket, campId);
    });

    socket.on('subscribeToMatching', () => {
      if (['admin', 'dispatcher'].includes(user.role)) {
        socket.join('matching-engine');
        console.log(`${user.name} subscribed to matching engine`);
      }
    });

    socket.on('unsubscribeFromMatching', () => {
      socket.leave('matching-engine');
    });

    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });
  }

  joinCampRoom(socket, campId) {
    socket.join(`camp:${campId}`);
    
    if (!this.campRooms.has(campId)) {
      this.campRooms.set(campId, new Set());
    }
    this.campRooms.get(campId).add(socket.id);
    
    console.log(`${socket.user.name} joined camp ${campId}`);
  }

  leaveCampRoom(socket, campId) {
    socket.leave(`camp:${campId}`);
    
    if (this.campRooms.has(campId)) {
      this.campRooms.get(campId).delete(socket.id);
      if (this.campRooms.get(campId).size === 0) {
        this.campRooms.delete(campId);
      }
    }
  }

  handleDisconnect(socket) {
    const userId = socket.userId;
    const user = socket.user;

    // Remove from user sockets
    if (this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(socket.id);
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
      }
    }

    // Remove from role room
    this.roleRooms[user.role].delete(socket.id);

    // Remove from camp rooms
    this.campRooms.forEach((sockets, campId) => {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        this.campRooms.delete(campId);
      }
    });

    console.log(`User disconnected: ${user.name} - ${socket.id}`);
  }

  // Emit to specific user
  emitToUser(userId, event, data) {
    if (!this.io) return;
    const sockets = this.userSockets.get(userId.toString());
    if (sockets) {
      sockets.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  // Emit to all users in a camp
  emitToCamp(campId, event, data) {
    if (!this.io) return;
    this.io.to(`camp:${campId}`).emit(event, data);
  }

  // Emit to all admins
  emitToAdmins(event, data) {
    if (!this.io) return;
    this.io.to('role:admin').emit(event, data);
  }

  // Emit to all dispatchers
  emitToDispatchers(event, data) {
    if (!this.io) return;
    this.io.to('role:dispatcher').emit(event, data);
  }

  // Emit to matching engine subscribers
  emitToMatchingEngine(event, data) {
    if (!this.io) return;
    this.io.to('matching-engine').emit(event, data);
  }

  // Emit to all connected clients
  emitToAll(event, data) {
    if (!this.io) return;
    this.io.emit(event, data);
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.userSockets.size;
  }

  // Get users in a camp
  getCampUsers(campId) {
    const sockets = this.campRooms.get(campId.toString());
    return sockets ? sockets.size : 0;
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.userSockets.has(userId.toString());
  }

  // Get all online users by role
  getOnlineUsersByRole(role) {
    return this.roleRooms[role]?.size || 0;
  }
}

let socketServiceInstance = null;

export const getSocketService = () => {
  if (!socketServiceInstance) {
    socketServiceInstance = new SocketService();
  }
  return socketServiceInstance;
};

export const initializeSocketService = (httpServer) => {
  const service = getSocketService();
  return service.initialize(httpServer);
};