import InventoryItem from '../models/InventoryItem.js';
import InventoryHistory from '../models/InventoryHistory.js';
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
  
  // Create history record
  await InventoryHistory.create({
    inventoryItemId: item._id,
    campId,
    category,
    itemName,
    action: 'created',
    previousQuantity: 0,
    newQuantity: quantity,
    quantityChange: quantity,
    unit,
    performedBy: req.userId,
    notes: 'Initial inventory entry'
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
  
  // Create history record if quantity changed
  if (quantityChange !== 0) {
    await InventoryHistory.create({
      inventoryItemId: item._id,
      campId: item.campId._id,
      category: item.category,
      itemName: item.itemName,
      action: quantityChange > 0 ? 'restocked' : 'consumed',
      previousQuantity,
      newQuantity: quantity,
      quantityChange,
      unit: item.unit,
      performedBy: req.userId,
      notes: `Quantity ${quantityChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(quantityChange)}`
    });
  }
  
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

export const bulkUpdateInventory = catchAsync(async (req, res) => {
  const { campId } = req.params;
  const { items } = req.body; // Array of { itemName, category, quantity, ... }
  
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Items array required', 400);
  }
  
  // Verify camp access
  if (req.user.role === 'coordinator' && req.user.campId?.toString() !== campId) {
    throw new AppError('Access denied', 403);
  }
  
  const results = [];
  const historyRecords = [];
  
  for (const itemData of items) {
    const { itemName, category, quantity, unit, minimumThreshold, expiryDate, batchNumber, notes } = itemData;
    
    let item = await InventoryItem.findOne({ campId, category, itemName });
    const previousQuantity = item?.quantity || 0;
    const newQuantity = quantity ?? 0;
    const quantityChange = newQuantity - previousQuantity;
    
    if (item) {
      item.quantity = newQuantity;
      if (minimumThreshold !== undefined) item.minimumThreshold = minimumThreshold;
      if (unit) item.unit = unit;
      if (expiryDate !== undefined) item.expiryDate = expiryDate;
      if (batchNumber !== undefined) item.batchNumber = batchNumber;
      if (notes !== undefined) item.notes = notes;
      item.lastUpdatedBy = req.userId;
      await item.save();
    } else {
      item = await InventoryItem.create({
        campId,
        category,
        itemName,
        quantity: newQuantity,
        unit,
        minimumThreshold,
        expiryDate,
        batchNumber,
        notes,
        lastUpdatedBy: req.userId
      });
    }
    
    results.push(item);
    
    if (quantityChange !== 0) {
      historyRecords.push({
        inventoryItemId: item._id,
        campId,
        category,
        itemName,
        action: quantityChange > 0 ? 'restocked' : 'consumed',
        previousQuantity,
        newQuantity,
        quantityChange,
        unit: item.unit,
        performedBy: req.userId,
        notes: `Bulk update: quantity ${quantityChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(quantityChange)}`
      });
    }
  }
  
  if (historyRecords.length > 0) {
    await InventoryHistory.insertMany(historyRecords);
  }
  
  const socketService = getSocketService();
  socketService.emitToCamp(campId, 'inventory:bulkUpdated', results);
  socketService.emitToAdmins('inventory:bulkUpdated', { campId, items: results });
  socketService.emitToMatchingEngine('inventory:changed', { campId });
  
  res.json({
    success: true,
    message: `Updated ${results.length} inventory items`,
    data: { items: results }
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
  
  await InventoryHistory.create({
    inventoryItemId: item._id,
    campId: item.campId._id,
    category: item.category,
    itemName: item.itemName,
    action: 'adjusted',
    previousQuantity: item.quantity,
    newQuantity: 0,
    quantityChange: -item.quantity,
    unit: item.unit,
    performedBy: req.userId,
    notes: 'Item deleted'
  });
  
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

export const getInventoryHistory = catchAsync(async (req, res) => {
  const { campId, inventoryItemId, category, page = 1, limit = 50, startDate, endDate } = req.query;
  
  const query = {};
  if (campId) query.campId = campId;
  if (inventoryItemId) query.inventoryItemId = inventoryItemId;
  if (category) query.category = category;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  
  if (req.user.role === 'coordinator' && req.user.campId) {
    query.campId = req.user.campId;
  }
  
  const skip = (page - 1) * limit;
  const history = await InventoryHistory.find(query)
    .populate('performedBy', 'name email')
    .populate('relatedTransferId', 'status')
    .populate('relatedRequestId', 'status')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });
  
  const total = await InventoryHistory.countDocuments(query);
  
  res.json({
    success: true,
    data: {
      history,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});