import InventoryItem from '../models/InventoryItem.js';
import Camp from '../models/Camp.js';
import { catchAsync } from '../middleware/error.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { getSocketService } from '../services/socket.service.js';

export const createInventoryItem = catchAsync(async (req, res) => {
  const { campId, category, itemName, quantity, unit, minimumThreshold, expiryDate, batchNumber, notes } = req.body;
  
  // Verify camp exists and user has access
  const camp = await Camp.findById(campId);
  if (!camp) {
    throw new AppError('Camp not found', 404);
  }
  
  if (req.user.role === 'coordinator' && req.user.campId?.toString() !== campId) {
    throw new AppError('Access denied', 403);
  }
  
  // Check if item already exists for this camp/category/name
  const existing = await InventoryItem.findOne({ campId, category, itemName });
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
  
  // Trigger matching check
  socketService.emitToMatchingEngine('inventory:changed', { campId, category, itemName });
  
  res.status(201).json({
    success: true,
    message: 'Inventory item created',
    data: { item }
  });
});

export const getInventory = catchAsync(async (req, res) => {
  const { campId, category, page = 1, limit = 50, lowStock, search } = req.query;
  
  const query = {};
  if (campId) query.campId = campId;
  if (category) query.category = category;
  if (lowStock === 'true') {
    query.$expr = { $lte: ['$quantity', '$minimumThreshold'] };
  }
  if (search) {
    query.itemName = { $regex: search, $options: 'i' };
  }
  
  // Coordinator access control
  if (req.user.role === 'coordinator' && req.user.campId) {
    query.campId = req.user.campId;
  }
  
  const skip = (page - 1) * limit;
  const items = await InventoryItem.find(query)
    .populate('campId', 'name location')
    .populate('lastUpdatedBy', 'name')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ category: 1, itemName: 1 });
  
  const total = await InventoryItem.countDocuments(query);
  
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
  
  // Verify camp access
  if (req.user.role === 'coordinator' && req.user.campId?.toString() !== campId) {
    throw new AppError('Access denied', 403);
  }
  
  const items = await InventoryItem.find({ campId })
    .populate('lastUpdatedBy', 'name')
    .sort({ category: 1, itemName: 1 });
  
  // Group by category
  const grouped = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});
  
  // Calculate summary stats
  const summary = await InventoryItem.aggregate([
    { $match: { campId: campId } },
    {
      $group: {
        _id: '$category',
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        lowStockCount: {
          $sum: { $cond: [{ $lte: ['$quantity', '$minimumThreshold'] }, 1, 0] }
        },
        outOfStockCount: {
          $sum: { $cond: [{ $eq: ['$quantity', 0] }, 1, 0] }
        }
      }
    }
  ]);
  
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
  
  const item = await InventoryItem.findById(req.params.id).populate('campId');
  if (!item) {
    throw new AppError('Inventory item not found', 404);
  }
  
  if (req.user.role === 'coordinator' && req.user.campId?.toString() !== item.campId._id.toString()) {
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
  
  const updatedItem = await InventoryItem.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).populate('campId', 'name').populate('lastUpdatedBy', 'name');
  
  const socketService = getSocketService();
  socketService.emitToCamp(item.campId._id, 'inventory:updated', updatedItem);
  socketService.emitToAdmins('inventory:updated', updatedItem);
  
  // Trigger matching if quantity changed significantly
  if (Math.abs(quantityChange) > 0) {
    socketService.emitToMatchingEngine('inventory:changed', { 
      campId: item.campId._id, 
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
  const item = await InventoryItem.findById(req.params.id).populate('campId');
  if (!item) {
    throw new AppError('Inventory item not found', 404);
  }
  
  if (req.user.role === 'coordinator' && req.user.campId?.toString() !== item.campId._id.toString()) {
    throw new AppError('Access denied', 403);
  }
  
  await InventoryItem.findByIdAndDelete(req.params.id);
  
  const socketService = getSocketService();
  socketService.emitToCamp(item.campId._id, 'inventory:deleted', { id: req.params.id });
  socketService.emitToAdmins('inventory:deleted', { id: req.params.id });
  socketService.emitToMatchingEngine('inventory:changed', { campId: item.campId._id });
  
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
  
  const summary = await InventoryItem.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$category',
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        lowStockCount: {
          $sum: { $cond: [{ $lte: ['$quantity', '$minimumThreshold'] }, 1, 0] }
        },
        outOfStockCount: {
          $sum: { $cond: [{ $eq: ['$quantity', 0] }, 1, 0] }
        },
        totalSurplus: {
          $sum: { $subtract: ['$quantity', '$minimumThreshold'] }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  const overall = await InventoryItem.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalItems: { $sum: 1 },
        totalCategories: { $addToSet: '$category' },
        totalQuantity: { $sum: '$quantity' },
        lowStockCount: {
          $sum: { $cond: [{ $lte: ['$quantity', '$minimumThreshold'] }, 1, 0] }
        },
        outOfStockCount: {
          $sum: { $cond: [{ $eq: ['$quantity', 0] }, 1, 0] }
        }
      }
    }
  ]);
  
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