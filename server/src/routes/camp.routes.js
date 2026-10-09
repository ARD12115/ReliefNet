import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { createCamp, getCamps, getCamp, updateCamp, deleteCamp, getNearbyCamps, getCampStats } from '../controllers/camp.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate, validateObjectId } from '../utils/validate.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Admin only routes
router.post('/', authorize('admin'), [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name too long'),
  body('location.lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('location.lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  body('capacity').optional().isInt({ min: 0 }).withMessage('Capacity must be a positive integer'),
  body('contactPerson').optional().trim().isLength({ max: 100 }).withMessage('Contact person name too long'),
  body('contactPhone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('contactEmail').optional().isEmail().withMessage('Invalid email'),
  body('location.address').optional().trim().isLength({ max: 200 }).withMessage('Address too long')
], validate, createCamp);

router.delete('/:id', authorize('admin'), validateObjectId(), deleteCamp);

// All authenticated users
router.get('/', [
  query('status').optional().isIn(['active', 'inactive', 'full', 'evacuated', 'evacuating']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term too long')
], validate, getCamps);

router.get('/nearby', [
  query('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  query('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  query('radius').optional().isInt({ min: 1000, max: 200000 }).withMessage('Radius must be between 1km and 200km')
], validate, getNearbyCamps);

router.get('/:id', validateObjectId(), getCamp);
router.get('/:id/stats', validateObjectId(), getCampStats);

router.patch('/:id', authorize('admin', 'coordinator'), validateObjectId(), [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }).withMessage('Name too long'),
  body('location.lat').optional().isFloat({ min: -90, max: 90 }),
  body('location.lng').optional().isFloat({ min: -180, max: 180 }),
  body('capacity').optional().isInt({ min: 0 }),
  body('currentPopulation').optional().isInt({ min: 0 }),
  body('contactPerson').optional().trim().isLength({ max: 100 }).withMessage('Contact person name too long'),
  body('contactPhone').optional().isMobilePhone(),
  body('contactEmail').optional().isEmail(),
  body('status').optional().isIn(['active', 'inactive', 'full', 'evacuated', 'evacuating'])
], validate, updateCamp);

export default router;