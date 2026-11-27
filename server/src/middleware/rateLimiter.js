import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_REQUIRED = process.env.REDIS_REQUIRED === 'true';

let redisClient;
let redisReady = false;

const getRedisClient = async () => {
  if (redisClient && redisReady) return redisClient;
  
  redisClient = createClient({ url: REDIS_URL });
  redisClient.on('error', (err) => {
    console.error('Rate limiter Redis error:', err.message);
    redisReady = false;
  });
  redisClient.on('connect', () => {
    redisReady = true;
  });
  
  try {
    await Promise.race([
      redisClient.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), 5000)),
    ]);
  } catch (err) {
    if (REDIS_REQUIRED) {
      console.error('Rate limiter: Redis connection required but unavailable');
      throw err;
    }
    console.warn('Rate limiter: Redis unavailable, falling back to memory store');
    try { await redisClient.quit(); } catch {}
    redisClient = null;
    return null;
  }
  
  return redisClient;
};

export const shutdownRateLimiters = async () => {
  if (redisClient && redisReady) {
    await redisClient.quit();
    redisClient = null;
    redisReady = false;
  }
};

const createRedisStore = async (prefix) => {
  const client = await getRedisClient();
  if (!client) return undefined;
  
  return new RedisStore({
    sendCommand: (...args) => client.sendCommand(args),
    prefix,
  });
};
const WINDOW_15M = 15 * 60 * 1000;
const WINDOW_1H = 60 * 60 * 1000;

const baseConfig = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
    });
  },
};

let authRateLimiterImpl;
export const authRateLimiter = (req, res, next) => {
  if (!authRateLimiterImpl) return next(new Error('Rate limiters are not initialized'));
  return authRateLimiterImpl(req, res, next);
};
export let apiRateLimiter;
let strictRateLimiterImpl;
export const strictRateLimiter = (req, res, next) => {
  if (!strictRateLimiterImpl) return next(new Error('Rate limiters are not initialized'));
  return strictRateLimiterImpl(req, res, next);
};

export const initializeRateLimiters = async () => {
  const authStore = await createRedisStore('rl:auth:');
  const apiStore = await createRedisStore('rl:api:');
  const strictStore = await createRedisStore('rl:strict:');
  
  authRateLimiterImpl = rateLimit({
    ...baseConfig,
    store: authStore,
    windowMs: WINDOW_15M,
    max: 5,
    message: { success: false, message: 'Too many authentication attempts. Please try again in 15 minutes.' },
  });
  
  apiRateLimiter = rateLimit({
    ...baseConfig,
    store: apiStore,
    windowMs: WINDOW_15M,
    max: 100,
    message: { success: false, message: 'Too many API requests. Please try again in 15 minutes.' },
  });
  
  strictRateLimiterImpl = rateLimit({
    ...baseConfig,
    store: strictStore,
    windowMs: WINDOW_1H,
    max: 30,
    message: { success: false, message: 'Too many attempts. Please try again in an hour.' },
  });
  
  return { authRateLimiter: authRateLimiterImpl, apiRateLimiter, strictRateLimiter: strictRateLimiterImpl };
};
export const getRateLimiters = () => {
  if (!authRateLimiter || !apiRateLimiter || !strictRateLimiter) {
    throw new Error('Rate limiters not initialized. Call initializeRateLimiters() first.');
  }
  return { authRateLimiter, apiRateLimiter, strictRateLimiter };
};