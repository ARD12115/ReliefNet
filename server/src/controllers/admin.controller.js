import { DataTypes, Op, Sequelize } from 'sequelize';
import User from '../models/User.js';
import Camp from '../models/Camp.js';
import InventoryItem from '../models/InventoryItem.js';
import Request from '../models/Request.js';
import Transfer from '../models/Transfer.js';
import { catchAsync } from '../middleware/error.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import bcrypt from 'bcryptjs';
import { getSocketService } from '../services/socket.service.js';

const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export const getUsers = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, search, role, isActive } = req.query;

  const where = {};
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }
  if (role) where.role = role;
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const skip = (page - 1) * limit;
  const users = await User.findAll({
    where,
    include: [{ model: Camp, as: 'camp', attributes: ['name'] }],
    offset: skip,
    limit: parseInt(limit),
    order: [['createdAt', 'DESC']],
  });

  const total = await User.count({ where });

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

export const getUser = catchAsync(async (req, res) => {
  const user = await User.findByPk(req.params.id, {
    include: [{ model: Camp, as: 'camp', attributes: ['name'] }],
    attributes: { exclude: ['password', 'refreshToken'] },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    data: { user },
  });
});

export const updateUser = catchAsync(async (req, res) => {
  const { name, phone, role, campId, isActive } = req.query;

  const updateData = {};
  if (name) updateData.name = name;
  if (phone) updateData.phone = phone;
  if (role) updateData.role = role;
  if (campId) updateData.campId = campId;
  if (isActive !== undefined) updateData.isActive = isActive === 'true';

  const [, [user]] = await User.update(updateData, {
    where: { id: req.params.id },
    returning: true,
    individualHooks: true,
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    message: 'User updated successfully',
    data: { user: user.toJSON() },
  });
});

export const deactivateUser = catchAsync(async (req, res) => {
  const [, [user]] = await User.update(
    { isActive: false },
    { where: { id: req.params.id }, returning: true }
  );

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const socketService = getSocketService();
  socketService.emitToAdmins('user:deactivated', { id: user.id });

  res.json({
    success: true,
    message: 'User deactivated successfully',
    data: { user: user.toJSON() },
  });
});

export const activateUser = catchAsync(async (req, res) => {
  const [, [user]] = await User.update(
    { isActive: true },
    { where: { id: req.params.id }, returning: true }
  );

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    message: 'User activated successfully',
    data: { user: user.toJSON() },
  });
});

export const inviteUser = catchAsync(async (req, res) => {
  const { email, role, campId, name, phone } = req.query;

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new AppError('Email already registered', 400);
  }

  const tempPassword = generateTempPassword();

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password: tempPassword,
    role,
    campId: campId || undefined,
    phone,
    isActive: true,
  });

  // In production, send email with temp password and setup link
  // For now, return temp password in response (admin only)
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = await bcrypt.hash(refreshToken, 12);
  await user.save();

  res.status(201).json({
    success: true,
    message: 'User invited successfully. Share the temporary password securely.',
    data: {
      user: user.toJSON(),
      tempPassword,
      accessToken,
      refreshToken,
    },
  });
});

// ============ ANALYTICS ENDPOINTS ============

export const getAnalyticsOverview = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  const dateFilter = startDate || endDate ? { 
    createdAt: {
      ...(startDate && { [Op.gte]: new Date(startDate) }),
      ...(endDate && { [Op.lte]: new Date(endDate) }),
    }
  } : {};

  const [
    totalCamps,
    activeCamps,
    totalUsers,
    activeUsers,
    totalInventoryItems,
    lowStockItems,
    totalRequests,
    openRequests,
    criticalRequests,
    fulfilledRequests,
    totalTransfers,
    deliveredTransfers,
    inTransitTransfers,
  ] = await Promise.all([
    Camp.count(),
    Camp.count({ where: { status: 'active' } }),
    User.count(),
    User.count({ where: { isActive: true } }),
    InventoryItem.sum('quantity'),
    InventoryItem.count({
      where: Sequelize.where(
        Sequelize.col('quantity'), 
        '<=', 
        Sequelize.col('minimumThreshold')
      ),
    }),
    Request.count({ where: dateFilter }),
    Request.count({ where: { ...dateFilter, status: 'open' } }),
    Request.count({ where: { ...dateFilter, urgency: 'critical' } }),
    Request.count({ where: { ...dateFilter, status: 'fulfilled' } }),
    Transfer.count({ where: dateFilter }),
    Transfer.count({ where: { ...dateFilter, status: 'delivered' } }),
    Transfer.count({ where: { ...dateFilter, status: 'in_transit' } }),
  ]);

  const avgDeliveryTime = await Transfer.findAll({
    attributes: [
      [Sequelize.fn('AVG', 
        Sequelize.fn('EXTRACT', Sequelize.literal('EPOCH FROM (updatedAt - createdAt)')))
      , 'avgSeconds']
    ],
    where: { 
      status: 'delivered',
      ...dateFilter 
    },
    raw: true,
  });

  const fulfillmentRate = totalRequests > 0 ? Math.round((fulfilledRequests / totalRequests) * 100) : 0;

  res.json({
    success: true,
    data: {
      overview: {
        camps: { total: totalCamps, active: activeCamps },
        users: { total: totalUsers, active: activeUsers },
        inventory: { totalItems: totalInventoryItems || 0, lowStock: lowStockItems },
        requests: { total: totalRequests, open: openRequests, critical: criticalRequests },
        transfers: { total: totalTransfers, delivered: deliveredTransfers, inTransit: inTransitTransfers },
        avgDeliveryTimeHours: avgDeliveryTime[0]?.avgSeconds ? Math.round(avgDeliveryTime[0].avgSeconds / 3600 * 10) / 10 : 0,
        kpis: {
          avgResponseTimeHours: avgDeliveryTime[0]?.avgSeconds ? Math.round(avgDeliveryTime[0].avgSeconds / 3600 * 10) / 10 : 0,
          fulfillmentRate,
        },
      },
    },
  });
});

export const getRequestsTrend = catchAsync(async (req, res) => {
  const { startDate, endDate, interval = 'month' } = req.query;
  
  const dateFilter = startDate || endDate ? { 
    createdAt: {
      ...(startDate && { [Op.gte]: new Date(startDate) }),
      ...(endDate && { [Op.lte]: new Date(endDate) }),
    }
  } : { createdAt: { [Op.gte]: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } };

  const dateFormat = interval === 'day' ? '%Y-%m-%d' : interval === 'week' ? '%Y-%W' : '%Y-%m';

  const requests = await Request.findAll({
    attributes: [
      [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), dateFormat), 'period'],
      [Sequelize.fn('COUNT', '*'), 'total'],
      [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN status = 'fulfilled' THEN 1 ELSE 0 END")), 'fulfilled'],
    ],
    where: dateFilter,
    group: [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), dateFormat)],
    order: [[Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), dateFormat), 'ASC']],
    raw: true,
  });

  res.json({
    success: true,
    data: { trend: requests.map(r => ({ period: r.period, total: parseInt(r.total), fulfilled: parseInt(r.fulfilled || 0) })) },
  });
});

export const getInventoryDistribution = catchAsync(async (req, res) => {
  const { campId } = req.query;

  const where = campId ? { campId } : {};

  const [byCategory, byCamp] = await Promise.all([
    InventoryItem.findAll({
      attributes: [
        'category',
        [Sequelize.fn('SUM', Sequelize.col('quantity')), 'totalQuantity'],
        [Sequelize.fn('COUNT', '*'), 'itemCount'],
      ],
      where,
      group: ['category'],
      raw: true,
    }),
    InventoryItem.findAll({
      attributes: [
        'campId',
        [Sequelize.fn('SUM', Sequelize.col('quantity')), 'totalQuantity'],
        [Sequelize.fn('COUNT', '*'), 'itemCount'],
      ],
      where,
      include: [{ model: Camp, as: 'camp', attributes: ['name'] }],
      group: ['campId', 'camp.id'],
      raw: true,
    }),
  ]);

  res.json({
    success: true,
    data: {
      byCategory: byCategory.map(c => ({ category: c.category, totalQuantity: parseInt(c.totalQuantity), itemCount: parseInt(c.itemCount) })),
      byCamp: byCamp.map(c => ({ campId: c.campId, campName: c['camp.name'], totalQuantity: parseInt(c.totalQuantity), itemCount: parseInt(c.itemCount) })),
    },
  });
});

export const getTransferPerformance = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  const dateFilter = startDate || endDate ? { 
    createdAt: {
      ...(startDate && { [Op.gte]: new Date(startDate) }),
      ...(endDate && { [Op.lte]: new Date(endDate) }),
    }
  } : {};

  const [byStatus, byPriority, avgTimes] = await Promise.all([
    Transfer.findAll({
      attributes: [
        'status',
        [Sequelize.fn('COUNT', '*'), 'count'],
      ],
      where: dateFilter,
      group: ['status'],
      raw: true,
    }),
    Transfer.findAll({
      attributes: [
        'priority',
        [Sequelize.fn('COUNT', '*'), 'count'],
      ],
      where: dateFilter,
      group: ['priority'],
      raw: true,
    }),
    Transfer.findAll({
      attributes: [
        [Sequelize.fn('AVG', 
          Sequelize.fn('EXTRACT', Sequelize.literal('EPOCH FROM (updatedAt - createdAt)')))
        , 'avgSeconds'],
        [Sequelize.fn('MIN', 
          Sequelize.fn('EXTRACT', Sequelize.literal('EPOCH FROM (updatedAt - createdAt)')))
        , 'minSeconds'],
        [Sequelize.fn('MAX', 
          Sequelize.fn('EXTRACT', Sequelize.literal('EPOCH FROM (updatedAt - createdAt)')))
        , 'maxSeconds'],
      ],
      where: { status: 'delivered', ...dateFilter },
      raw: true,
    }),
  ]);

  const [byRoute] = await Promise.all([
    Transfer.findAll({
      attributes: [
        'fromCampId',
        'toCampId',
        [Sequelize.fn('COUNT', '*'), 'count'],
        [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN status = 'delivered' THEN 1 ELSE 0 END")), 'delivered'],
        [Sequelize.fn('AVG', 
          Sequelize.fn('EXTRACT', Sequelize.literal('EPOCH FROM (updatedAt - createdAt)')))
        , 'avgSeconds'],
      ],
      where: { status: 'delivered', ...dateFilter },
      include: [
        { model: Camp, as: 'fromCamp', attributes: ['name'] },
        { model: Camp, as: 'toCamp', attributes: ['name'] },
      ],
      group: ['fromCampId', 'toCampId', 'fromCamp.id', 'toCamp.id'],
      raw: true,
    }),
  ]);

  res.json({
    success: true,
    data: {
      byStatus: byStatus.map(s => ({ status: s.status, count: parseInt(s.count) })),
      byPriority: byPriority.map(p => ({ priority: p.priority, count: parseInt(p.count) })),
      avgDeliveryTimeHours: avgTimes[0]?.avgSeconds ? Math.round(avgTimes[0].avgSeconds / 3600 * 10) / 10 : 0,
      minDeliveryTimeHours: avgTimes[0]?.minSeconds ? Math.round(avgTimes[0].minSeconds / 3600 * 10) / 10 : 0,
      maxDeliveryTimeHours: avgTimes[0]?.maxSeconds ? Math.round(avgTimes[0].maxSeconds / 3600 * 10) / 10 : 0,
      byRoute: byRoute.map(r => ({
        fromCamp: r['fromCamp.name'],
        toCamp: r['toCamp.name'],
        count: parseInt(r.count),
        delivered: parseInt(r.delivered || 0),
        avgHours: r.avgSeconds ? Math.round(r.avgSeconds / 3600 * 10) / 10 : 0,
      })),
    },
  });
});

export const getCampPerformance = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  const dateFilter = startDate || endDate ? { 
    createdAt: {
      ...(startDate && { [Op.gte]: new Date(startDate) }),
      ...(endDate && { [Op.lte]: new Date(endDate) }),
    }
  } : {};

  const camps = await Camp.findAll({
    attributes: ['id', 'name', 'status', 'capacity', 'currentPopulation'],
    where: { status: { [Op.ne]: 'evacuated' } },
    raw: true,
  });

  const campIds = camps.map(c => c.id);

  const [requests, inventory, transfersOut, transfersIn] = await Promise.all([
    Request.findAll({
      attributes: [
        'campId',
        [Sequelize.fn('COUNT', '*'), 'totalRequests'],
        [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN status = 'fulfilled' THEN 1 ELSE 0 END")), 'fulfilled'],
        [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN urgency = 'critical' THEN 1 ELSE 0 END")), 'critical'],
      ],
      where: { campId: { [Op.in]: campIds }, ...dateFilter },
      group: ['campId'],
      raw: true,
    }),
    InventoryItem.findAll({
      attributes: [
        'campId',
        [Sequelize.fn('SUM', Sequelize.col('quantity')), 'totalQuantity'],
        [Sequelize.fn('COUNT', '*'), 'itemCount'],
      ],
      where: { campId: { [Op.in]: campIds } },
      group: ['campId'],
      raw: true,
    }),
    Transfer.findAll({
      attributes: [
        'fromCampId',
        [Sequelize.fn('COUNT', '*'), 'count'],
        [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN status = 'delivered' THEN 1 ELSE 0 END")), 'delivered'],
      ],
      where: { fromCampId: { [Op.in]: campIds }, ...dateFilter },
      group: ['fromCampId'],
      raw: true,
    }),
    Transfer.findAll({
      attributes: [
        'toCampId',
        [Sequelize.fn('COUNT', '*'), 'count'],
        [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN status = 'delivered' THEN 1 ELSE 0 END")), 'delivered'],
      ],
      where: { toCampId: { [Op.in]: campIds }, ...dateFilter },
      group: ['toCampId'],
      raw: true,
    }),
  ]);

  const performance = camps.map(camp => {
    const req = requests.find(r => r.campId === camp.id) || {};
    const inv = inventory.find(i => i.campId === camp.id) || {};
    const out = transfersOut.find(t => t.fromCampId === camp.id) || {};
    const in_ = transfersIn.find(t => t.toCampId === camp.id) || {};

    return {
      campId: camp.id,
      campName: camp.name,
      status: camp.status,
      capacity: camp.capacity,
      currentPopulation: camp.currentPopulation,
      occupancyRate: camp.capacity ? Math.round((camp.currentPopulation || 0) / camp.capacity * 100) : 0,
      totalRequests: parseInt(req.totalRequests || 0),
      fulfilledRequests: parseInt(req.fulfilled || 0),
      fulfillmentRate: req.totalRequests ? Math.round((req.fulfilled || 0) / req.totalRequests * 100) : 0,
      criticalRequests: parseInt(req.critical || 0),
      totalInventory: parseInt(inv.totalQuantity || 0),
      inventoryItems: parseInt(inv.itemCount || 0),
      transfersOut: parseInt(out.count || 0),
      transfersOutDelivered: parseInt(out.delivered || 0),
      transfersIn: parseInt(in_.count || 0),
      transfersInDelivered: parseInt(in_.delivered || 0),
    };
  });

  res.json({
    success: true,
    data: { camps: performance },
  });
});