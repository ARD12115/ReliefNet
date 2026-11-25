import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { errorHandler, notFound } from './middleware/error.middleware.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import campRoutes from './routes/camp.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import requestRoutes from './routes/request.routes.js';
import transferRoutes from './routes/transfer.routes.js';

// Middleware
import { initializeRateLimiters } from './middleware/rateLimiter.js';

dotenv.config();

const createApp = async () => {
  const { apiRateLimiter } = await initializeRateLimiters();
  
  const app = express();

  // Security middleware with enhanced headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    noSniff: true,
    xssFilter: true,
    frameguard: { action: 'deny' }
  }));

  // Strict CORS with origin whitelist
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000,https://reliefnet-lake.vercel.app').split(',').map(o => o.trim());
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 86400 // 24 hours
  }))

  // Apply rate limiting to all API routes
  app.use('/api/', apiRateLimiter);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Health check
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/camps', campRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/requests', requestRoutes);
  app.use('/api/transfers', transferRoutes);

  // 404 handler
  app.use(notFound);

  // Error handler
  app.use(errorHandler);

  return app;
};

export default createApp;