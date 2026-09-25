import Transfer from '../models/Transfer.js';
import Request from '../models/Request.js';
import InventoryItem from '../models/InventoryItem.js';
import InventoryHistory from '../models/InventoryHistory.js';
import Camp from '../models/Camp.js';
import User from '../models/User.js';
import { catchAsync } from '../middleware/error.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { getSocketService } from '../services/socket.service.js';
import { getRoutingService } from '../services/routing.service.js';

export const getTransfers = catchAsync(async (req, res) => {
  const { fromCampId, toCampId, requestId, status, priority, page = 1, limit = 20 } = req.query;
  
  const query = {};
  if (fromCampId) query.fromCampId = fromCampId;
  if (toCampId) query.toCampId = toCampId;
  if (requestId) query.requestId = requestId;
  if (status) query.status = status;
  if (priority) query.priority = priority;
  
  // Coordinator access control - can see transfers for their camp
  if (req.user.role === 'coordinator' && req.user.campId) {
    query.$or = [
      { fromCampId: req.user.campId },
      { toCampId: req.user.campId }
    ];
  }
  
  // Dispatcher sees all, but can filter
  // Admin sees all
  
  const skip = (page - 1) * limit;
  const transfers = await Transfer.find(query)
    .populate('fromCampId', 'name location')
    .populate('toCampId', 'name location')
    .populate('requestId', 'itemName category urgency quantityNeeded')
    .populate('assignedTo', 'name email')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ priority: -1, createdAt: -1 });
  
  const total = await Transfer.countDocuments(query);
  
  res.json({
    success: true,
    data: {
      transfers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

export const getTransfer = catchAsync(async (req, res) => {
  const transfer = await Transfer.findById(req.params.id)
    .populate('fromCampId', 'name location contactPerson contactPhone')
    .populate('toCampId', 'name location contactPerson contactPhone')
    .populate('requestId', 'itemName category urgency quantityNeeded quantityFulfilled')
    .populate('assignedTo', 'name email phone')
    .populate('createdBy', 'name email');
  
  if (!transfer) {
    throw new AppError('Transfer not found', 404);
  }
  
  // Coordinator access control
  if (req.user.role === 'coordinator' && req.user.campId) {
    const campIdStr = req.user.campId.toString();
    if (transfer.fromCampId._id.toString() !== campIdStr && transfer.toCampId._id.toString() !== campIdStr) {
      throw new AppError('Access denied', 403);
    }
  }
  
  res.json({
    success: true,
    data: { transfer }
  });
});

export const assignTransfer = catchAsync(async (req, res) => {
  const transfer = await Transfer.findById(req.params.id)
    .populate('fromCampId')
    .populate('toCampId')
    .populate('requestId');
  
  if (!transfer) {
    throw new AppError('Transfer not found', 404);
  }
  
  if (transfer.status !== 'proposed') {
    throw new AppError(`Cannot assign transfer with status: ${transfer.status}`, 400);
  }
  
  // Verify assigned user exists and is a dispatcher or admin
  const assignee = await User.findById(req.body.assignedToId);
  if (!assignee || !['dispatcher', 'admin'].includes(assignee.role)) {
    throw new AppError('Invalid assignee. Must be a dispatcher or admin.', 400);
  }
  
  // Verify fromCamp still has the inventory
  const inventory = await InventoryItem.findOne({
    campId: transfer.fromCampId._id,
    category: transfer.category,
    itemName: transfer.itemName
  });
  
  if (!inventory || inventory.surplusQuantity < transfer.quantity) {
    throw new AppError('Insufficient surplus at source camp. Transfer may be invalid.', 400);
  }
  
  transfer.status = 'assigned';
  transfer.assignedTo = assignee._id;
  transfer.assignedAt = new Date();
  await transfer.save();
  
  const populatedTransfer = await Transfer.findById(transfer._id)
    .populate('fromCampId', 'name location')
    .populate('toCampId', 'name location')
    .populate('requestId', 'itemName category urgency')
    .populate('assignedTo', 'name email');
  
  const socketService = getSocketService();
  socketService.emitToCamp(transfer.fromCampId._id, 'transfer:updated', populatedTransfer);
  socketService.emitToCamp(transfer.toCampId._id, 'transfer:updated', populatedTransfer);
  socketService.emitToUser(assignee._id, 'transfer:assigned', populatedTransfer);
  socketService.emitToAdmins('transfer:updated', populatedTransfer);
  socketService.emitToDispatchers('transfer:updated', populatedTransfer);
  
  res.json({
    success: true,
    message: 'Transfer assigned',
    data: { transfer: populatedTransfer }
  });
});

export const updateTransferStatus = catchAsync(async (req, res) => {
  const { status, notes, cancellationReason } = req.body;
  
  const transfer = await Transfer.findById(req.params.id)
    .populate('fromCampId')
    .populate('toCampId')
    .populate('requestId');
  
  if (!transfer) {
    throw new AppError('Transfer not found', 404);
  }
  
  // Authorization checks
  const isAssignedDispatcher = transfer.assignedTo?.toString() === req.userId.toString();
  const isAdmin = req.user.role === 'admin';
  const isFromCampCoordinator = req.user.role === 'coordinator' && req.user.campId?.toString() === transfer.fromCampId._id.toString();
  const isToCampCoordinator = req.user.role === 'coordinator' && req.user.campId?.toString() === transfer.toCampId._id.toString();
  
  const validTransitions = {
    proposed: ['assigned', 'cancelled'],
    assigned: ['in_transit', 'cancelled'],
    in_transit: ['delivered', 'cancelled', 'failed'],
    delivered: [],
    cancelled: [],
    failed: ['in_transit'] // Can retry failed transfer
  };
  
  if (!validTransitions[transfer.status]?.includes(status)) {
    throw new AppError(`Invalid status transition from ${transfer.status} to ${status}`, 400);
  }
  
  // Permission checks for each transition
  if (status === 'assigned' && !isAdmin) {
    throw new AppError('Only admins can assign transfers', 403);
  }
  if (status === 'in_transit' && !isAssignedDispatcher && !isAdmin && !isFromCampCoordinator) {
    throw new AppError('Only assigned dispatcher, admin, or source camp coordinator can mark in transit', 403);
  }
  if (status === 'delivered' && !isAssignedDispatcher && !isAdmin && !isToCampCoordinator) {
    throw new AppError('Only assigned dispatcher, admin, or destination camp coordinator can mark delivered', 403);
  }
  if (status === 'cancelled' && !isAdmin && !isAssignedDispatcher && !isFromCampCoordinator) {
    throw new AppError('Only admin, assigned dispatcher, or source camp coordinator can cancel', 403);
  }
  if (status === 'failed' && !isAssignedDispatcher && !isAdmin) {
    throw new AppError('Only assigned dispatcher or admin can mark failed', 403);
  }
  
  const previousStatus = transfer.status;
  transfer.status = status;
  if (notes) transfer.notes = transfer.notes ? `${transfer.notes}\n${notes}` : notes;
  
  // Handle inventory changes on status transitions
  if (status === 'in_transit' && previousStatus === 'assigned') {
    // Decrement fromCamp inventory
    const fromInventory = await InventoryItem.findOne({
      campId: transfer.fromCampId._id,
      category: transfer.category,
      itemName: transfer.itemName
    });
    
    if (fromInventory) {
      const prevQty = fromInventory.quantity;
      fromInventory.quantity = Math.max(0, prevQty - transfer.quantity);
      fromInventory.lastUpdatedBy = req.userId;
      await fromInventory.save();
      
      await InventoryHistory.create({
        inventoryItemId: fromInventory._id,
        campId: transfer.fromCampId._id,
        category: transfer.category,
        itemName: transfer.itemName,
        action: 'transfer_out',
        previousQuantity: prevQty,
        newQuantity: fromInventory.quantity,
        quantityChange: -transfer.quantity,
        unit: transfer.unit,
        relatedTransferId: transfer._id,
        performedBy: req.userId,
        notes: `Transfer ${transfer._id} dispatched`
      });
    }
    
    transfer.dispatchedAt = new Date();
  }
  
  if (status === 'delivered' && previousStatus === 'in_transit') {
    // Increment toCamp inventory
    let toInventory = await InventoryItem.findOne({
      campId: transfer.toCampId._id,
      category: transfer.category,
      itemName: transfer.itemName
    });
    
    if (toInventory) {
      const prevQty = toInventory.quantity;
      toInventory.quantity += transfer.quantity;
      toInventory.lastUpdatedBy = req.userId;
      await toInventory.save();
      
      await InventoryHistory.create({
        inventoryItemId: toInventory._id,
        campId: transfer.toCampId._id,
        category: transfer.category,
        itemName: transfer.itemName,
        action: 'transfer_in',
        previousQuantity: prevQty,
        newQuantity: toInventory.quantity,
        quantityChange: transfer.quantity,
        unit: transfer.unit,
        relatedTransferId: transfer._id,
        performedBy: req.userId,
        notes: `Transfer ${transfer._id} delivered`
      });
    } else {
      // Create new inventory item at destination
      toInventory = await InventoryItem.create({
        campId: transfer.toCampId._id,
        category: transfer.category,
        itemName: transfer.itemName,
        quantity: transfer.quantity,
        unit: transfer.unit,
        minimumThreshold: 10,
        lastUpdatedBy: req.userId
      });
      
      await InventoryHistory.create({
        inventoryItemId: toInventory._id,
        campId: transfer.toCampId._id,
        category: transfer.category,
        itemName: transfer.itemName,
        action: 'transfer_in',
        previousQuantity: 0,
        newQuantity: transfer.quantity,
        quantityChange: transfer.quantity,
        unit: transfer.unit,
        relatedTransferId: transfer._id,
        performedBy: req.userId,
        notes: `Transfer ${transfer._id} delivered (new item created)`
      });
    }
    
    // Update request fulfillment
    const request = await Request.findById(transfer.requestId._id);
    if (request) {
      request.quantityFulfilled += transfer.quantity;
      await request.save();
    }
    
    transfer.deliveredAt = new Date();
  }
  
  if (status === 'cancelled') {
    transfer.cancelledAt = new Date();
    transfer.cancellationReason = cancellationReason || 'Cancelled by user';
    
    // If was in_transit, we need to handle the inventory that was already deducted
    if (previousStatus === 'in_transit') {
      // Return inventory to fromCamp (it never left or returned)
      const fromInventory = await InventoryItem.findOne({
        campId: transfer.fromCampId._id,
        category: transfer.category,
        itemName: transfer.itemName
      });
      
      if (fromInventory) {
        const prevQty = fromInventory.quantity;
        fromInventory.quantity += transfer.quantity;
        fromInventory.lastUpdatedBy = req.userId;
        await fromInventory.save();
        
        await InventoryHistory.create({
          inventoryItemId: fromInventory._id,
          campId: transfer.fromCampId._id,
          category: transfer.category,
          itemName: transfer.itemName,
          action: 'adjusted',
          previousQuantity: prevQty,
          newQuantity: fromInventory.quantity,
          quantityChange: transfer.quantity,
          unit: transfer.unit,
          relatedTransferId: transfer._id,
          performedBy: req.userId,
          notes: `Transfer ${transfer._id} cancelled - inventory restored`
        });
      }
    }
  }
  
  if (status === 'failed') {
    // Similar to cancelled but marked as failed delivery
    transfer.cancellationReason = cancellationReason || 'Delivery failed';
    
    // Return inventory to fromCamp
    const fromInventory = await InventoryItem.findOne({
      campId: transfer.fromCampId._id,
      category: transfer.category,
      itemName: transfer.itemName
    });
    
    if (fromInventory) {
      const prevQty = fromInventory.quantity;
      fromInventory.quantity += transfer.quantity;
      fromInventory.lastUpdatedBy = req.userId;
      await fromInventory.save();
      
      await InventoryHistory.create({
        inventoryItemId: fromInventory._id,
        campId: transfer.fromCampId._id,
        category: transfer.category,
        itemName: transfer.itemName,
        action: 'adjusted',
        previousQuantity: prevQty,
        newQuantity: fromInventory.quantity,
        quantityChange: transfer.quantity,
        unit: transfer.unit,
        relatedTransferId: transfer._id,
        performedBy: req.userId,
        notes: `Transfer ${transfer._id} failed - inventory restored`
      });
    }
  }
  
  await transfer.save();
  
  const populatedTransfer = await Transfer.findById(transfer._id)
    .populate('fromCampId', 'name location')
    .populate('toCampId', 'name location')
    .populate('requestId', 'itemName category urgency')
    .populate('assignedTo', 'name email');
  
  const socketService = getSocketService();
  socketService.emitToCamp(transfer.fromCampId._id, 'transfer:updated', populatedTransfer);
  socketService.emitToCamp(transfer.toCampId._id, 'transfer:updated', populatedTransfer);
  if (transfer.assignedTo) {
    socketService.emitToUser(transfer.assignedTo.toString(), 'transfer:updated', populatedTransfer);
  }
  socketService.emitToAdmins('transfer:updated', populatedTransfer);
  socketService.emitToDispatchers('transfer:updated', populatedTransfer);
  
  // Trigger matching re-check after delivery/cancellation
  if (['delivered', 'cancelled', 'failed'].includes(status)) {
    socketService.emitToMatchingEngine('transfer:completed', { 
      campId: transfer.fromCampId._id, 
      category: transfer.category, 
      itemName: transfer.itemName 
    });
    socketService.emitToMatchingEngine('transfer:completed', { 
      campId: transfer.toCampId._id, 
      category: transfer.category, 
      itemName: transfer.itemName 
    });
  }
  
  res.json({
    success: true,
    message: `Transfer status updated to ${status}`,
    data: { transfer: populatedTransfer }
  });
});

export const deleteTransfer = catchAsync(async (req, res) => {
  const transfer = await Transfer.findById(req.params.id);
  
  if (!transfer) {
    throw new AppError('Transfer not found', 404);
  }
  
  if (transfer.status !== 'proposed' && transfer.status !== 'cancelled') {
    throw new AppError('Can only delete proposed or cancelled transfers', 400);
  }
  
  await Transfer.findByIdAndDelete(req.params.id);
  
  const socketService = getSocketService();
  socketService.emitToAdmins('transfer:deleted', { id: req.params.id });
  
  res.json({
    success: true,
    message: 'Transfer deleted'
  });
});

export const getTransferStats = catchAsync(async (req, res) => {
  const { campId } = req.query;
  
  const match = {};
  if (campId) {
    match.$or = [{ fromCampId: campId }, { toCampId: campId }];
  }
  if (req.user.role === 'coordinator' && req.user.campId) {
    const campIdStr = req.user.campId.toString();
    match.$or = [
      { fromCampId: req.user.campId },
      { toCampId: req.user.campId }
    ];
  }
  
  const [byStatus, byPriority, totalDelivered, totalQuantity] = await Promise.all([
    Transfer.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    Transfer.aggregate([
      { $match: match },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]),
    Transfer.countDocuments({ ...match, status: 'delivered' }),
    Transfer.aggregate([
      { $match: { ...match, status: 'delivered' } },
      { $group: { _id: null, totalQuantity: { $sum: '$quantity' } } }
    ])
  ]);
  
  res.json({
    success: true,
    data: {
      byStatus,
      byPriority,
      totalDelivered,
      totalQuantityDelivered: totalQuantity[0]?.totalQuantity || 0
    }
  });
});

export const createManualTransfer = catchAsync(async (req, res) => {
  const { fromCampId, toCampId, requestId, itemName, category, quantity, unit, priority, notes } = req.body;
  
  // Verify camps
  const [fromCamp, toCamp] = await Promise.all([
    Camp.findById(fromCampId),
    Camp.findById(toCampId)
  ]);
  
  if (!fromCamp || !toCamp) {
    throw new AppError('Source or destination camp not found', 404);
  }
  
  // Verify request if provided
  let request = null;
  if (requestId) {
    request = await Request.findById(requestId);
    if (!request) {
      throw new AppError('Request not found', 404);
    }
  }
  
  // Verify source has inventory
  const inventory = await InventoryItem.findOne({
    campId: fromCampId,
    category,
    itemName
  });
  
  if (!inventory || inventory.surplusQuantity < quantity) {
    throw new AppError('Insufficient surplus at source camp', 400);
  }
  
  // Get route
  const routingService = getRoutingService();
  const route = await routingService.getRoute(
    fromCamp.location.coordinates[1], fromCamp.location.coordinates[0],
    toCamp.location.coordinates[1], toCamp.location.coordinates[0]
  );
  
  const transfer = await Transfer.create({
    fromCampId,
    toCampId,
    requestId: request?._id,
    itemName,
    category,
    quantity,
    unit: unit || 'units',
    routeDistanceKm: route.distanceKm,
    routeDurationMinutes: route.durationMinutes,
    routeGeometry: route.geometry,
    priority: priority || 'medium',
    notes,
    createdBy: req.userId
  });
  
  const populatedTransfer = await Transfer.findById(transfer._id)
    .populate('fromCampId', 'name location')
    .populate('toCampId', 'name location')
    .populate('requestId', 'itemName category urgency')
    .populate('createdBy', 'name email');
  
  const socketService = getSocketService();
  socketService.emitToCamp(fromCampId, 'transfer:created', populatedTransfer);
  socketService.emitToCamp(toCampId, 'transfer:created', populatedTransfer);
  socketService.emitToAdmins('transfer:created', populatedTransfer);
  socketService.emitToDispatchers('transfer:created', populatedTransfer);
  
  res.status(201).json({
    success: true,
    message: 'Manual transfer created',
    data: { transfer: populatedTransfer }
  });
});