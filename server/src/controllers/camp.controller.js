import { DataTypes, Op, Sequelize } from 'sequelize';
import Camp from '../models/Camp.js';
import InventoryItem from '../models/InventoryItem.js';
import Request from '../models/Request.js';
import Transfer from '../models/Transfer.js';
import User from '../models/User.js';
import { catchAsync } from '../middleware/error.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { getSocketService } from '../services/socket.service.js';

export const createCamp = catchAsync(async (req, res) => {
  const { name, location, capacity, contactPerson, contactPhone, contactEmail, address } = req.body;

  const camp = await Camp.create({
    name,
    latitude: location?.lat,
    longitude: location?.lng,
    address,
    capacity,
    contactPerson,
    contactPhone,
    contactEmail,
    managedBy: req.userId
  });

  const socketService = getSocketService();
  socketService.emitToAdmins('camp:created', camp);

  res.status(201).json({
    success: true,
    message: 'Camp created successfully',
    data: { camp }
  });
});

export const getCamps = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 20, search } = req.query;

  const where = {};
  if (status) where.status = status;
  const whereClauses = [where];
  if (search) {
    whereClauses.push({
      [Op.or]: [
        { name: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } }
      ]
    });
  }
  const finalWhere = whereClauses.length > 1 ? { [Op.and]: whereClauses } : whereClauses[0];

  // Non-admin users only see their assigned camp
  if (req.user.role === 'coordinator' && req.user.campId) {
    finalWhere.id = req.user.campId;
  }

  const skip = (page - 1) * limit;
  const camps = await Camp.findAll({
    where: finalWhere,
    include: [{ model: User, as: 'managedBy', attributes: ['name', 'email'] }],
    offset: skip,
    limit: parseInt(limit),
    order: [['createdAt', 'DESC']]
  });

  const total = await Camp.count({ where: finalWhere });

  res.json({
    success: true,
    data: {
      camps,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

export const getCamp = catchAsync(async (req, res) => {
  const camp = await Camp.findByPk(req.params.id, {
    include: [{ model: User, as: 'managedBy', attributes: ['name', 'email', 'phone'] }]
  });

  if (!camp) {
    throw new AppError('Camp not found', 404);
  }

  // Check access for coordinators
  if (req.user.role === 'coordinator' && req.user.campId !== camp.id) {
    throw new AppError('Access denied', 403);
  }

  res.json({
    success: true,
    data: { camp }
  });
});

export const updateCamp = catchAsync(async (req, res) => {
  const { name, location, capacity, currentPopulation, contactPerson, contactPhone, contactEmail, address, status } = req.body;

  const updateData = {};
  if (name) updateData.name = name;
  if (location) {
    updateData.latitude = location.lat;
    updateData.longitude = location.lng;
    updateData.address = address || '';
  }
  if (capacity !== undefined) updateData.capacity = capacity;
  if (currentPopulation !== undefined) updateData.currentPopulation = currentPopulation;
  if (contactPerson) updateData.contactPerson = contactPerson;
  if (contactPhone) updateData.contactPhone = contactPhone;
  if (contactEmail) updateData.contactEmail = contactEmail;
  if (status) updateData.status = status;

  const [, [camp]] = await Camp.update(updateData, {
    where: { id: req.params.id },
    returning: true
  });

  if (!camp) {
    throw new AppError('Camp not found', 404);
  }

  const socketService = getSocketService();
  socketService.emitToCamp(camp.id, 'camp:updated', camp);
  socketService.emitToAdmins('camp:updated', camp);

  res.json({
    success: true,
    message: 'Camp updated successfully',
    data: { camp }
  });
});

export const deleteCamp = catchAsync(async (req, res) => {
  const deletedCount = await Camp.destroy({ where: { id: req.params.id } });

  if (!deletedCount) {
    throw new AppError('Camp not found', 404);
  }

  const socketService = getSocketService();
  socketService.emitToAdmins('camp:deleted', { id: req.params.id });

  res.json({
    success: true,
    message: 'Camp deleted successfully'
  });
});

export const getNearbyCamps = catchAsync(async (req, res) => {
  const { lat, lng, radius = 50000 } = req.query; // radius in meters, default 50km

  if (!lat || !lng) {
    throw new AppError('Latitude and longitude required', 400);
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  // Approximate degrees per meter at the equator; adjust longitude by cosine of latitude
  const latDelta = radius / 111320;
  const lngDelta = latDelta / Math.cos(latitude * Math.PI / 180);

  const camps = await Camp.findAll({
    where: {
      status: 'active',
      latitude: { [Op.between]: [latitude - latDelta, latitude + latDelta] },
      longitude: { [Op.between]: [longitude - lngDelta, longitude + lngDelta] }
    },
    limit: 20
  });

  res.json({
    success: true,
    data: { camps }
  });
});

export const getCampStats = catchAsync(async (req, res) => {
  const campId = req.params.id;

  const [inventoryCount, requestCount, transferOutCount, transferInCount] = await Promise.all([
    InventoryItem.count({ where: { campId } }),
    Request.count({ where: { campId } }),
    Transfer.count({ where: { fromCampId: campId } }),
    Transfer.count({ where: { toCampId: campId } })
  ]);

  const inventoryByCategory = await InventoryItem.findAll({
    attributes: [
      'category',
      [Sequelize.fn('SUM', Sequelize.col('quantity')), 'totalQuantity'],
      [Sequelize.fn('COUNT', '*'), 'itemCount']
    ],
    where: { campId },
    group: ['category'],
    raw: true
  });

  const requestsByStatus = await Request.findAll({
    attributes: [
      'status',
      [Sequelize.fn('COUNT', '*'), 'count']
    ],
    where: { campId },
    group: ['status'],
    raw: true
  });

  res.json({
    success: true,
    data: {
      inventoryCount,
      requestCount,
      transferOutCount,
      transferInCount,
      inventoryByCategory,
      requestsByStatus
    }
  });
});
