import { Router } from 'express';
import { body, query } from 'express-validator';
import {
  createInventoryItem,
  getInventory,
  getCampInventory,
  updateInventoryItem,
  deleteInventoryItem,
  getInventorySummary
} from '../controllers/inventory.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate, validateObjectId } from '../utils/validate.js';

const router = Router();

router.use(authenticate);

// All roles can view
router.get('/', [
  query('campId').optional().isUUID(),
  query('category').optional().isIn(['food', 'water', 'medicine', 'shelter', 'other', 'clothing', 'sanitation']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('lowStock').optional().isIn(['true', 'false']),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term too long')
], validate, getInventory);

router.get('/summary', getInventorySummary);

router.get('/camp/:campId', validateObjectId('campId'), getCampInventory);

// Coordinator/Admin for their camp, Admin for all
router.post('/', authorize('admin', 'coordinator'), [
  body('campId').isUUID().withMessage('Valid camp ID required'),
  body('category').isIn(['food', 'water', 'medicine', 'shelter', 'other', 'clothing', 'sanitation']).withMessage('Invalid category'),
  body('itemName').trim().notEmpty().withMessage('Item name required').isLength({ max: 100 }).withMessage('Item name too long'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be non-negative'),
  body('unit').optional().isIn(['units', 'kg', 'liters', 'boxes', 'packs', 'bottles', 'rolls', 'meters']),
  body('minimumThreshold').optional().isInt({ min: 0 }),
  body('expiryDate').optional().isISO8601(),
  body('batchNumber').optional().trim().isLength({ max: 100 }).withMessage('Batch number too long'),
  body('notes').optional().trim().isLength({ max: 500 })
], validate, createInventoryItem);

router.patch('/:id', authorize('admin', 'coordinator'), validateObjectId(), [
  body('quantity').optional().isInt({ min: 0 }),
  body('minimumThreshold').optional().isInt({ min: 0 }),
  body('unit').optional().isIn(['units', 'kg', 'liters', 'boxes', 'packs', 'bottles', 'rolls', 'meters']),
  body('expiryDate').optional().isISO8601(),
  body('batchNumber').optional().trim().isLength({ max: 100 }).withMessage('Batch number too long'),
  body('notes').optional().trim().isLength({ max: 500 })
], validate, updateInventoryItem);

router.delete('/:id', authorize('admin', 'coordinator'), validateObjectId(), deleteInventoryItem);

export default router;