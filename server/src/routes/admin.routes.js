import { Router } from 'express';
import { query } from 'express-validator';
import { 
  getUsers,
  getUser,
  updateUser,
  deactivateUser,
  activateUser,
  inviteUser
} from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate, validateObjectId } from '../utils/validate.js';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/users', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term too long'),
  query('role').optional().isIn(['coordinator', 'dispatcher', 'admin']),
  query('isActive').optional().isIn(['true', 'false']),
], validate, getUsers);

router.post('/users/invite', [
  query('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  query('role').isIn(['coordinator', 'dispatcher', 'admin']).withMessage('Invalid role'),
  query('campId').optional().isUUID().withMessage('Invalid camp ID'),
  query('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name too long'),
  query('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
], validate, inviteUser);

router.get('/users/:id', validateObjectId(), getUser);

router.patch('/users/:id', validateObjectId(), [
  query('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 100 }).withMessage('Name too long'),
  query('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  query('role').optional().isIn(['coordinator', 'dispatcher', 'admin']).withMessage('Invalid role'),
  query('campId').optional().isUUID().withMessage('Invalid camp ID'),
  query('isActive').optional().isIn(['true', 'false']),
], validate, updateUser);

router.patch('/users/:id/deactivate', validateObjectId(), deactivateUser);
router.patch('/users/:id/activate', validateObjectId(), activateUser);

export default router;