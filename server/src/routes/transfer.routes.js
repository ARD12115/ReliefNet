import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { 
  getTransfers, 
  getTransfer, 
  assignTransfer, 
  updateTransferStatus, 
  deleteTransfer, 
  getTransferStats,
  createManualTransfer
} from '../controllers/transfer.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate, validateObjectId } from '../utils/validate.js';

const router = Router();

router.use(authenticate);

router.get('/', [
  query('fromCampId').optional().isMongoId(),
  query('toCampId').optional().isMongoId(),
  query('requestId').optional().isMongoId(),
  query('status').optional().isIn(['proposed', 'assigned', 'in_transit', 'delivered', 'cancelled', 'failed']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], validate, getTransfers);

router.get('/stats', getTransferStats);

router.get('/:id', validateObjectId(), getTransfer);

router.post('/manual', authorize('admin', 'dispatcher'), [
  body('fromCampId').isMongoId().withMessage('Valid source camp ID required'),
  body('toCampId').isMongoId().withMessage('Valid destination camp ID required'),
  body('requestId').optional().isMongoId(),
  body('itemName').trim().notEmpty().withMessage('Item name required'),
  body('category').isIn(['food', 'water', 'medicine', 'shelter', 'clothing', 'sanitation', 'other']).withMessage('Invalid category'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('unit').optional().isIn(['units', 'kg', 'liters', 'boxes', 'packs', 'bottles', 'rolls', 'meters']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('notes').optional().trim().isLength({ max: 1000 })
], validate, createManualTransfer);

router.post('/:id/assign', authorize('admin', 'dispatcher'), validateObjectId(), [
  body('assignedToId').isMongoId().withMessage('Valid assignee ID required')
], validate, assignTransfer);

router.patch('/:id/status', authorize('admin', 'dispatcher', 'coordinator'), validateObjectId(), [
  body('status').isIn(['assigned', 'in_transit', 'delivered', 'cancelled', 'failed']).withMessage('Invalid status'),
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('cancellationReason').optional().trim().isLength({ max: 500 })
], validate, updateTransferStatus);

router.delete('/:id', authorize('admin'), validateObjectId(), deleteTransfer);

export default router;