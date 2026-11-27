import { Router } from 'express';
import { query } from 'express-validator';
import {
  getAnalyticsOverview,
  getRequestsTrend,
  getInventoryDistribution,
  getTransferPerformance,
  getCampPerformance
} from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../utils/validate.js';

const router = Router();

// All analytics routes require admin authentication
router.use(authenticate, authorize('admin'));

// Overview KPIs
router.get('/overview', getAnalyticsOverview);

// Requests trend over time
router.get('/requests-trend', [
  query('period').optional().isIn(['7d', '30d', '90d', '6m', '12m'])
], validate, getRequestsTrend);

// Inventory distribution by category and camp
router.get('/inventory-distribution', [
  query('campId').optional().isUUID()
], validate, getInventoryDistribution);

// Transfer performance metrics
router.get('/transfer-performance', [
  query('period').optional().isIn(['7d', '30d', '90d', '6m', '12m'])
], validate, getTransferPerformance);

// Camp performance comparison
router.get('/camp-performance', getCampPerformance);

export default router;