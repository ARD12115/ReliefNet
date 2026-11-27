import { Op, Sequelize } from 'sequelize';
import InventoryItem from '../models/InventoryItem.js';
import Camp from '../models/Camp.js';
import User from '../models/User.js';
import '../models/associations.js';
import { catchAsync } from '../middleware/error.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { getSocketService } from '../services/socket.service.js';

export const createInventoryItem = catchAsync(async (req, res) => {
  const { campId, category, itemName, quantity, unit, minimumThreshold, expiryDate, batchNumber, notes } = req.body;

  const camp = await Camp.findByPk(campId);
  if (!camp) {
    throw new AppError('Camp not found', 404);
  }

  if (req.user.role === 'coordinator' && req.user.campId !== campId) {
    throw new AppError('Access denied', 403);
  }

  const existing = await InventoryItem.findOne({ where: { campId, category, itemName } });
  if (existing) {
    throw new AppError('Item already exists for this camp. Use update instead.', 400);
  }

  const item = await InventoryItem.create({
    campId,
    category,
    itemName,
    quantity,
    unit,
    minimumThreshold,
    expiryDate,
    batchNumber,
    notes,
    lastUpdatedBy: req.userId
  });

  const socketService = getSocketService();
  socketService.emitToCamp(campId, 'inventory:updated', item);
  socketService.emitToAdmins('inventory:updated', item);
  socketService.emitToMatchingEngine('inventory:changed', { campId, category, itemName });

  res.status(201).json({
    success: true,
    message: 'Inventory item created',
    data: { item }
  });
});

export const getInventory = catchAsync(async (req, res) => {
  const { campId, category, page = 1, limit = 50, lowStock, search } = req.query;

  const whereClauses = [];
  if (campId) whereClauses.push({ campId });
  if (category) whereClauses.push({ category });
  if (search) whereClauses.push({ itemName: { [Op.iLike]: `%${search}%` } });
  if (lowStock === 'true') {
    whereClauses.push(Sequelize.where(Sequelize.col('quantity'), { [Op.lte]: Sequelize.col('minimumThreshold') }));
  }
  const where = whereClauses.length > 1 ? { [Op.and]: whereClauses } : (whereClauses[0] || {});

  const skip = (page - 1) * limit;
  const items = await InventoryItem.findAll({
    where,
    include: [
      { model: Camp, as: 'camp', attributes: ['name', 'latitude', 'longitude'] },
      { model: User, as: 'updater', attributes: ['name'] }
    ],
    offset: skip,
    limit: parseInt(limit),
    order: [['category', 'ASC'], ['itemName', 'ASC']]
  });

  const total = await InventoryItem.count({ where });

  res.json({
    success: true,
    data: {
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

export const getCampInventory = catchAsync(async (req, res) => {
  const { campId } = req.params;

  if (req.user.role === 'coordinator' && req.user.campId !== campId) {
    throw new AppError('Access denied', 403);
  }

  const items = await InventoryItem.findAll({
    where: { campId },
    include: [{ model: User, as: 'updater', attributes: ['name'] }],
    order: [['category', 'ASC'], ['itemName', 'ASC']]
  });

  const grouped = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  const summary = await InventoryItem.findAll({
    attributes: [
      'category',
      [Sequelize.fn('COUNT', '*'), 'totalItems'],
      [Sequelize.fn('SUM', Sequelize.col('quantity')), 'totalQuantity'],
      [Sequelize.literal('SUM(CASE WHEN "quantity" <= "minimumThreshold" THEN 1 ELSE 0 END)'), 'lowStockCount'],
      [Sequelize.literal('SUM(CASE WHEN "quantity" = 0 THEN 1 ELSE 0 END)'), 'outOfStockCount']
    ],
    where: { campId },
    group: ['category'],
    raw: true
  });

  res.json({
    success: true,
    data: {
      items: grouped,
      summary
    }
  });
});

export const updateInventoryItem = catchAsync(async (req, res) => {
  const { quantity, minimumThreshold, unit, expiryDate, batchNumber, notes } = req.body;

  const item = await InventoryItem.findByPk(req.params.id, {
    include: [{ model: Camp, as: 'camp', attributes: ['id', 'name'] }]
  });
  if (!item) {
    throw new AppError('Inventory item not found', 404);
  }

  if (req.user.role === 'coordinator' && req.user.campId !== item.campId) {
    throw new AppError('Access denied', 403);
  }

  const previousQuantity = item.quantity;
  const quantityChange = quantity !== undefined ? quantity - previousQuantity : 0;

  const updateData = { lastUpdatedBy: req.userId };
  if (quantity !== undefined) updateData.quantity = quantity;
  if (minimumThreshold !== undefined) updateData.minimumThreshold = minimumThreshold;
  if (unit) updateData.unit = unit;
  if (expiryDate !== undefined) updateData.expiryDate = expiryDate;
  if (batchNumber !== undefined) updateData.batchNumber = batchNumber;
  if (notes !== undefined) updateData.notes = notes;

  const [, [updatedItem]] = await InventoryItem.update(updateData, {
    where: { id: req.params.id },
    returning: true,
    include: [{ model: Camp, as: 'camp', attributes: ['id', 'name'] }, { model: User, as: 'updater', attributes: ['name'] }]
  });

  const socketService = getSocketService();
  socketService.emitToCamp(item.campId, 'inventory:updated', updatedItem);
  socketService.emitToAdmins('inventory:updated', updatedItem);

  if (Math.abs(quantityChange) > 0) {
    socketService.emitToMatchingEngine('inventory:changed', {
      campId: item.campId,
      category: item.category,
      itemName: item.itemName
    });
  }

  res.json({
    success: true,
    message: 'Inventory item updated',
    data: { item: updatedItem }
  });
});

export const deleteInventoryItem = catchAsync(async (req, res) => {
  const item = await InventoryItem.findByPk(req.params.id, {
    include: [{ model: Camp, as: 'camp', attributes: ['id'] }]
  });
  if (!item) {
    throw new AppError('Inventory item not found', 404);
  }

  if (req.user.role === 'coordinator' && req.user.campId !== item.campId) {
    throw new AppError('Access denied', 403);
  }

  await InventoryItem.destroy({ where: { id: req.params.id } });

  const socketService = getSocketService();
  socketService.emitToCamp(item.campId, 'inventory:deleted', { id: req.params.id });
  socketService.emitToAdmins('inventory:deleted', { id: req.params.id });
  socketService.emitToMatchingEngine('inventory:changed', { campId: item.campId });

  res.json({
    success: true,
    message: 'Inventory item deleted'
  });
});

export const getInventorySummary = catchAsync(async (req, res) => {
  const { campId } = req.query;

  const match = campId ? { campId } : {};
  if (req.user.role === 'coordinator' && req.user.campId) {
    match.campId = req.user.campId;
  }

  const summary = await InventoryItem.findAll({
    attributes: [
      'category',
      [Sequelize.fn('COUNT', '*'), 'totalItems'],
      [Sequelize.fn('SUM', Sequelize.col('quantity')), 'totalQuantity'],
      [Sequelize.literal('SUM(CASE WHEN "quantity" <= "minimumThreshold" THEN 1 ELSE 0 END)'), 'lowStockCount'],
      [Sequelize.literal('SUM(CASE WHEN "quantity" = 0 THEN 1 ELSE 0 END)'), 'outOfStockCount'],
      [Sequelize.literal('SUM("quantity" - "minimumThreshold")'), 'totalSurplus']
    ],
    where: match,
    group: ['category'],
    order: [['category', 'ASC']],
    raw: true
  });

  const overall = await InventoryItem.findAll({
    attributes: [
      [Sequelize.fn('COUNT', '*'), 'totalItems'],
      [Sequelize.literal('COUNT(DISTINCT "category")'), 'totalCategories'],
      [Sequelize.fn('SUM', Sequelize.col('quantity')), 'totalQuantity'],
      [Sequelize.literal('SUM(CASE WHEN "quantity" <= "minimumThreshold" THEN 1 ELSE 0 END)'), 'lowStockCount'],
      [Sequelize.literal('SUM(CASE WHEN "quantity" = 0 THEN 1 ELSE 0 END)'), 'outOfStockCount']
    ],
    where: match,
    raw: true
  });

  res.json({
    success: true,
    data: {
      byCategory: summary,
      overall: overall[0] || {
        totalItems: 0,
        totalCategories: [],
        totalQuantity: 0,
        lowStockCount: 0,
        outOfStockCount: 0
      }
    }
  });
});
