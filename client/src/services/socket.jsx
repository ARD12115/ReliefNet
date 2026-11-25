import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) return;

    const socketUrl = process.env.SERVER_URL || import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';
    
    this.socket = io(socketUrl, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.emit('subscribeToMatching');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    // Set up event forwarding to listeners
    this.setupEventForwarding();
  }

  setupEventForwarding() {
    const events = [
      'inventory:updated',
      'inventory:bulkUpdated',
      'inventory:deleted',
      'request:created',
      'request:updated',
      'transfer:created',
      'transfer:updated',
      'transfer:deleted',
      'transfer:assigned',
      'match:found',
      'camp:created',
      'camp:updated',
      'camp:deleted',
      'stats:updated'
    ];

    events.forEach(event => {
      this.socket.on(event, (data) => {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(callback => callback(data));
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Camp room management
  joinCamp(campId) {
    if (this.socket?.connected) {
      this.socket.emit('joinCamp', campId);
    }
  }

  leaveCamp(campId) {
    if (this.socket?.connected) {
      this.socket.emit('leaveCamp', campId);
    }
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  off(event, callback) {
    const callbacks = this.listeners.get(event) || [];
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();