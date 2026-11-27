import { Router } from 'express';
import { body, query } from 'express-validator';
import { register, login, refresh, logout, getMe, updateProfile, changePassword, getUsers, getUser, updateUser, deleteUser } from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate, validateObjectId } from '../utils/validate.js';
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

// Protected routes (authenticated users)
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

// Admin-only user management routes
router.use('/admin', authenticate, authorize('admin'));

router.get('/admin/users', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term too long'),
  query('role').optional().isIn(['coordinator', 'dispatcher', 'admin']),
  query('isActive').optional().isIn(['true', 'false'])
], validate, getUsers);

router.get('/admin/users/:id', validateObjectId(), getUser);

router.patch('/admin/users/:id', validateObjectId(), [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }).withMessage('Name too long'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('role').optional().isIn(['coordinator', 'dispatcher', 'admin']).withMessage('Invalid role'),
  body('campId').optional().isUUID().withMessage('Invalid camp ID'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
], validate, updateUser);

router.delete('/admin/users/:id', validateObjectId(), deleteUser);

export default router;