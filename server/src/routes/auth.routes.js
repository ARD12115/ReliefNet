import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, refresh, logout, getMe, updateProfile, changePassword } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../utils/validate.js';
import { authRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

  // Public routes with rate limiting
  router.post('/register', authRateLimiter, [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name too long'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 12 }).withMessage('Password must be at least 12 characters')
      .matches(/\p{Lu}/u).withMessage('Password must contain uppercase letter')
      .matches(/\p{Ll}/u).withMessage('Password must contain lowercase letter')
      .matches(/\p{N}/u).withMessage('Password must contain number')
      .matches(/\p{P}/u).withMessage('Password must contain special character'),
    body('role').optional().isIn(['coordinator', 'dispatcher', 'admin']).withMessage('Invalid role'),
    body('campId').optional().isUUID().withMessage('Invalid camp ID'),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number')
  ], validate, register);

  router.post('/login', authRateLimiter, [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required')
  ], validate, login);

  router.post('/refresh', strictRateLimiter, refresh);
  router.post('/logout', logout);

  // Protected routes
  router.get('/me', authenticate, getMe);
  router.patch('/profile', authenticate, [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 100 }).withMessage('Name too long'),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number')
  ], validate, updateProfile);

  router.patch('/password', authenticate, strictRateLimiter, [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword')
      .isLength({ min: 12 }).withMessage('Password must be at least 12 characters')
      .matches(/\p{Lu}/u).withMessage('Password must contain uppercase letter')
      .matches(/\p{Ll}/u).withMessage('Password must contain lowercase letter')
      .matches(/\p{N}/u).withMessage('Password must contain number')
      .matches(/\p{P}/u).withMessage('Password must contain special character')
  ], validate, changePassword);

  export default router;