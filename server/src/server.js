import http from 'http';
import dotenv from 'dotenv';
import createApp from './app.js';
import connectDB from './config/db.js';
import { initializeSocketService } from './services/socket.service.js';
import { startMatchingCron } from './services/matching.service.js';
import { shutdownRateLimiters } from './middleware/rateLimiter.js';

dotenv.config();

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Create Express app (initializes rate limiters with Redis)
    const app = await createApp();
    
    // Create HTTP server
    const server = http.createServer(app);
    
    // Initialize Socket.IO
    initializeSocketService(server);
    
    // Start matching cron job
    startMatchingCron();
    
    // Start listening
    server.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    ReliefNet Server                          ║
║                   Aid, precisely delivered                   ║
╠══════════════════════════════════════════════════════════════╣
║  Server running on port ${PORT}                                 ║
║  Environment: ${process.env.NODE_ENV || 'development'}                              ║
║  API: http://localhost:${PORT}/api                              ║
║  Health: http://localhost:${PORT}/health                        ║
╚══════════════════════════════════════════════════════════════╝
      `);
    });
    
    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        console.log('HTTP server closed');
        await shutdownRateLimiters();
        console.log('Rate limiters shut down');
        process.exit(0);
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();