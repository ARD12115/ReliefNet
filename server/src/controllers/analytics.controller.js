import { DataTypes, Op, Sequelize } from 'sequelize';
import { catchAsync } from '../middleware/error.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import Camp from '../models/Camp.js';
import InventoryItem from '../models/InventoryItem.js';
import Request from '../models/Request.js';
import Transfer from '../models/Transfer.js';
import User from '../models/User.js';

export const getAnalyticsOverview = catchAsync(async (req, res) => {
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
    totalTransfers,
    inTransitTransfers,
    deliveredTransfers
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
      )
    }),
    Request.count(),
    Request.count({ where: { status: { [Op.in]: ['open', 'partial'] } } }),
    Request.count({ where: { urgency: 'critical', status: { [Op.in]: ['open', 'partial'] } } }),
    Transfer.count(),
    Transfer.count({ where: { status: 'in_transit' } }),
    Transfer.count({ where: { status: 'delivered' } })
  ]);

  const avgResponseTimeResult = await Request.findAll({
    attributes: [
      [Sequelize.fn('AVG', Sequelize.literal('EXTRACT(EPOCH FROM ("updatedAt" - "createdAt"))/3600')), 'avgHours']
    ],
    where: {
      status: { [Op.in]: ['fulfilled', 'matched'] },
      updatedAt: { [Op.ne]: null }
    },
    raw: true
  });

  const avgResponseTimeHours = avgResponseTimeResult[0]?.avgHours ? parseFloat(avgResponseTimeResult[0].avgHours).toFixed(1) : 0;

  const fulfillmentRate = totalRequests > 0 ? ((deliveredTransfers / totalRequests) * 100).toFixed(1) : 0;

  res.json({
    success: true,
    data: {
      camps: { total: totalCamps, active: activeCamps },
      users: { total: totalUsers, active: activeUsers },
      inventory: { totalItems: totalInventoryItems || 0, lowStock: lowStockItems },
      requests: { total: totalRequests, open: openRequests, critical: criticalRequests },
      transfers: { total: totalTransfers, inTransit: inTransitTransfers, delivered: deliveredTransfers },
      kpis: {
        avgResponseTimeHours: parseFloat(avgResponseTimeHours),
        fulfillmentRate: parseFloat(fulfillmentRate)
      }
    }
  });
});

export const getRequestsTrend = catchAsync(async (req, res) => {
  const { period = '6m' } = req.query;
  let dateFilter;
  const now = new Date();

  switch (period) {
    case '7d':
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '12m':
      dateFilter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case '6m':
    default:
      dateFilter = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  }

  const requests = await Request.findAll({
    attributes: [
      [Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('createdAt')), 'month'],
      [Sequelize.fn('COUNT', '*'), 'total'],
      [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN status = \'fulfilled\' THEN 1 END')), 'fulfilled'],
      [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN urgency = \'critical\' THEN 1 END')), 'critical']
    ],
    where: {
      createdAt: { [Op.gte]: dateFilter }
    },
    group: [Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('createdAt'))],
    order: [[Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('createdAt')), 'ASC']],
    raw: true
  });

  // Fill in missing months
  const months = [];
  const current = new Date(dateFilter);
  while (current <= now) {
    const key = current.toISOString().slice(0, 7);
    const found = requests.find(r => r.month?.startsWith(key));
    months.push({
      month: current.toLocaleString('default', { month: 'short' }),
      total: found ? parseInt(found.total) : 0,
      fulfilled: found ? parseInt(found.fulfilled) : 0,
      critical: found ? parseInt(found.critical) : 0
    });
    current.setMonth(current.getMonth() + 1);
  }

  res.json({
    success: true,
    data: { trend: months, period }
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
        [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN quantity = 0 THEN 1 ELSE 0 END')), 'outOfStock'],
        [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN quantity <= "minimumThreshold" AND quantity > 0 THEN 1 ELSE 0 END')), 'lowStock']
      ],
      where,
      group: ['category'],
      raw: true
    }),
    campId ? [] : InventoryItem.findAll({
      attributes: [
        'campId',
        [Sequelize.fn('SUM', Sequelize.col('quantity')), 'totalQuantity'],
        [Sequelize.fn('COUNT', '*'), 'itemCount'],
        [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN quantity <= "minimumThreshold" THEN 1 ELSE 0 END')), 'alerts']
      ],
      include: [{ model: Camp, as: 'camp', attributes: ['id', 'name'] }],
      where,
      group: ['campId', 'camp.id'],
      order: [[Sequelize.fn('SUM', Sequelize.col('quantity')), 'DESC']],
      raw: true,
      limit: 20
    })
  ]);

  res.json({
    success: true,
    data: {
      byCategory: byCategory.map(c => ({
        category: c.category,
        totalQuantity: parseInt(c.totalQuantity) || 0,
        itemCount: parseInt(c.itemCount) || 0,
        outOfStock: parseInt(c.outOfStock) || 0,
        lowStock: parseInt(c.lowStock) || 0
      })),
      byCamp: byCamp.map(c => ({
        campId: c.campId,
        campName: c['camp.name'],
        totalQuantity: parseInt(c.totalQuantity) || 0,
        itemCount: parseInt(c.itemCount) || 0,
        alerts: parseInt(c.alerts) || 0
      }))
    }
  });
});

export const getTransferPerformance = catchAsync(async (req, res) => {
  const { period = '6m' } = req.query;
  let dateFilter;
  const now = new Date();

  switch (period) {
    case '7d':
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '12m':
      dateFilter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case '6m':
    default:
      dateFilter = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  }

  const [byStatus, byPriority, avgDeliveryTime, topRoutes] = await Promise.all([
    Transfer.findAll({
      attributes: [
        'status',
        [Sequelize.fn('COUNT', '*'), 'count']
      ],
      where: { createdAt: { [Op.gte]: dateFilter } },
      group: ['status'],
      raw: true
    }),
    Transfer.findAll({
      attributes: [
        'priority',
        [Sequelize.fn('COUNT', '*'), 'count']
      ],
      where: { createdAt: { [Op.gte]: dateFilter } },
      group: ['priority'],
      raw: true
    }),
    Transfer.findAll({
      attributes: [
        [Sequelize.fn('AVG', Sequelize.literal('EXTRACT(EPOCH FROM ("updatedAt" - "createdAt"))/3600')), 'avgHours']
      ],
      where: {
        status: 'delivered',
        updatedAt: { [Op.ne]: null },
        createdAt: { [Op.gte]: dateFilter }
      },
      raw: true
    }),
    Transfer.findAll({
      attributes: [
        'fromCampId',
        'toCampId',
        [Sequelize.fn('COUNT', '*'), 'count'],
        [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN status = \'delivered\' THEN 1 ELSE 0 END')), 'delivered']
      ],
      where: { createdAt: { [Op.gte]: dateFilter } },
      group: ['fromCampId', 'toCampId'],
      order: [[Sequelize.fn('COUNT', '*'), 'DESC']],
      limit: 10,
      include: [
        { model: Camp, as: 'fromCamp', attributes: ['id', 'name'] },
        { model: Camp, as: 'toCamp', attributes: ['id', 'name'] }
      ],
      raw: true
    })
  ]);

  res.json({
    success: true,
    data: {
      byStatus: byStatus.map(s => ({ status: s.status, count: parseInt(s.count) })),
      byPriority: byPriority.map(p => ({ priority: p.priority, count: parseInt(p.count) })),
      avgDeliveryHours: avgDeliveryTime[0]?.avgHours ? parseFloat(avgDeliveryTime[0].avgHours).toFixed(1) : 0,
      topRoutes: topRoutes.map(r => ({
        fromCamp: r['fromCamp.name'],
        toCamp: r['toCamp.name'],
        total: parseInt(r.count),
        delivered: parseInt(r.delivered),
        successRate: r.count > 0 ? ((r.delivered / r.count) * 100).toFixed(1) : 0
      }))
    }
  });
});

export const getCampPerformance = catchAsync(async (req, res) => {
  const camps = await Camp.findAll({
    attributes: ['id', 'name', 'status', 'capacity', 'currentPopulation'],
    include: [
      {
        model: Request,
        as: 'requests',
        attributes: [
          [Sequelize.fn('COUNT', '*'), 'totalRequests'],
          [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN status = \'fulfilled\' THEN 1 END')), 'fulfilledRequests'],
          [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN urgency = \'critical\' THEN 1 END')), 'criticalRequests']
        ],
        required: false
      },
      {
        model: Transfer,
        as: 'transfersOut',
        attributes: [
          [Sequelize.fn('COUNT', '*'), 'transfersOut'],
          [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN status = \'delivered\' THEN 1 END')), 'deliveredOut']
        ],
        required: false
      },
      {
        model: Transfer,
        as: 'transfersIn',
        attributes: [
          [Sequelize.fn('COUNT', '*'), 'transfersIn'],
          [Sequelize.fn('COUNT', Sequelize.literal('CASE WHEN status = \'delivered\' THEN 1 END')), 'deliveredIn']
        ],
        required: false
      }
    ],
    order: [['name', 'ASC']]
  });

  const campPerformance = camps.map(camp => {
    const requests = camp.requests?.[0] || {};
    const transfersOut = camp.transfersOut?.[0] || {};
    const transfersIn = camp.transfersIn?.[0] || {};

    const totalRequests = parseInt(requests.totalRequests) || 0;
    const fulfilledRequests = parseInt(requests.fulfilledRequests) || 0;
    const criticalRequests = parseInt(requests.criticalRequests) || 0;
    const transfersOutCount = parseInt(transfersOut.transfersOut) || 0;
    const deliveredOut = parseInt(transfersOut.deliveredOut) || 0;
    const transfersInCount = parseInt(transfersIn.transfersIn) || 0;
    const deliveredIn = parseInt(transfersIn.deliveredIn) || 0;

    const utilization = camp.capacity ? ((camp.currentPopulation || 0) / camp.capacity * 100).toFixed(1) : 0;
    const fulfillmentRate = totalRequests > 0 ? (fulfilledRequests / totalRequests * 100).toFixed(1) : 0;

    return {
      id: camp.id,
      name: camp.name,
      status: camp.status,
      capacity: camp.capacity,
      currentPopulation: camp.currentPopulation || 0,
      utilization: parseFloat(utilization),
      requests: { total: totalRequests, fulfilled: fulfilledRequests, critical: criticalRequests },
      fulfillmentRate: parseFloat(fulfillmentRate),
      transfers: { out: transfersOutCount, outDelivered: deliveredOut, in: transfersInCount, inDelivered: deliveredIn }
    };
  });

  res.json({
    success: true,
    data: { camps: campPerformance }
  });
});