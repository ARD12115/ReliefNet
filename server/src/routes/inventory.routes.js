import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { 
  createInventoryItem, 
  getInventory, 
  getCampInventory, 
  updateInventoryItem, 
  bulkUpdateInventory,
  deleteInventoryItem,
  getInventorySummary,
  getInventoryHistory
} from '../controllers/inventory.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate, validateObjectId } from '../utils/validate.js';

const router = Router();

router.use(authenticate);

// All roles can view
router.get('/', [
  query('campId').optional().isMongoId(),
  query('category').optional().isIn(['food', 'water', 'medicine', 'shelter', 'clothing', 'sanitation', 'other']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('lowStock').optional().isIn(['true', 'false']),
  query('search').optional().trim()
], validate, getInventory);

router.get('/summary', getInventorySummary);
router.get('/history', [
  query('campId').optional().isMongoId(),
  query('inventoryItemId').optional().isMongoId(),
  query('category').optional().isIn(['food', 'water', 'medicine', 'shelter', 'clothing', 'sanitation', 'other']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], validate, getInventoryHistory);

router.get('/camp/:campId', validateObjectId('campId'), getCampInventory);

// Coordinator/Admin for their camp, Admin for all
router.post('/', authorize('admin', 'coordinator'), [
  body('campId').isMongoId().withMessage('Valid camp ID required'),
  body('category').isIn(['food', 'water', 'medicine', 'shelter', 'clothing', 'sanitation', 'other']).withMessage('Invalid category'),
  body('itemName').trim().notEmpty().withMessage('Item name required'),
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be non-negative'),
  body('unit').optional().isIn(['units', 'kg', 'liters', 'boxes', 'packs', 'bottles', 'rolls', 'meters']),
  body('minimumThreshold').optional().isInt({ min: 0 }),
  body('expiryDate').optional().isISO8601(),
  body('batchNumber').optional().trim(),
  body('notes').optional().trim().isLength({ max: 500 })
], validate, createInventoryItem);

router.post('/camp/:campId/bulk', authorize('admin', 'coordinator'), validateObjectId('campId'), [
  body('items').isArray({ min: 1 }).withMessage('Items array required'),
  body('items.*.itemName').trim().notEmpty(),
  body('items.*.category').isIn(['food', 'water', 'medicine', 'shelter', 'clothing', 'sanitation', 'other']),
  body('items.*.quantity').optional().isInt({ min: 0 }),
  body('items.*.unit').optional().isIn(['units', 'kg', 'liters', 'boxes', 'packs', 'bottles', 'rolls', 'meters']),
  body('items.*.minimumThreshold').optional().isInt({ min: 0 }),
  body('items.*.expiryDate').optional().isISO8601(),
  body('items.*.batchNumber').optional().trim(),
  body('items.*.notes').optional().trim().isLength({ max: 500 })
], validate, bulkUpdateInventory);

router.patch('/:id', authorize('admin', 'coordinator'), validateObjectId(), [
  body('quantity').optional().isInt({ min: 0 }),
  body('minimumThreshold').optional().isInt({ min: 0 }),
  body('unit').optional().isIn(['units', 'kg', 'liters', 'boxes', 'packs', 'bottles', 'rolls', 'meters']),
  body('expiryDate').optional().isISO8601(),
  body('batchNumber').optional().trim(),
  body('notes').optional().trim().isLength({ max: 500 })
], validate, updateInventoryItem);

router.delete('/:id', authorize('admin', 'coordinator'), validateObjectId(), deleteInventoryItem);

export default router;