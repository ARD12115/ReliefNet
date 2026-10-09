import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { 
  createRequest, 
  getRequests, 
  getRequest, 
  updateRequest, 
  cancelRequest, 
  getRequestStats 
} from '../controllers/request.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate, validateObjectId } from '../utils/validate.js';

const router = Router();

router.use(authenticate);

router.get('/', [
  query('campId').optional().isMongoId(),
  query('category').optional().isIn(['food', 'water', 'medicine', 'shelter', 'clothing', 'sanitation', 'other']),
  query('status').optional().isIn(['open', 'partial', 'matched', 'fulfilled', 'cancelled']),
  query('urgency').optional().isIn(['low', 'medium', 'high', 'critical']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term too long')
], validate, getRequests);

router.get('/stats', getRequestStats);

router.get('/:id', validateObjectId(), getRequest);

router.post('/', authorize('admin', 'coordinator'), [
  body('campId').isMongoId().withMessage('Valid camp ID required'),
  body('category').isIn(['food', 'water', 'medicine', 'shelter', 'clothing', 'sanitation', 'other']).withMessage('Invalid category'),
  body('itemName').trim().notEmpty().withMessage('Item name required').isLength({ max: 100 }).withMessage('Item name too long'),
  body('quantityNeeded').isInt({ min: 1 }).withMessage('Quantity needed must be at least 1'),
  body('unit').optional().isIn(['units', 'kg', 'liters', 'boxes', 'packs', 'bottles', 'rolls', 'meters']),
  body('urgency').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid urgency'),
  body('description').optional().trim().isLength({ max: 1000 })
], validate, createRequest);

router.patch('/:id', authorize('admin', 'coordinator'), validateObjectId(), [
  body('quantityNeeded').optional().isInt({ min: 1 }),
  body('urgency').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('status').optional().isIn(['open', 'partial', 'matched', 'fulfilled', 'cancelled'])
], validate, updateRequest);

router.post('/:id/cancel', authorize('admin', 'coordinator'), validateObjectId(), [
  body('reason').trim().notEmpty().withMessage('Cancellation reason required').isLength({ max: 500 }).withMessage('Reason too long')
], validate, cancelRequest);

export default router;