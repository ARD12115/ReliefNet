import { Op, Sequelize } from 'sequelize';
import Transfer from '../models/Transfer.js';
import Request from '../models/Request.js';
import InventoryItem from '../models/InventoryItem.js';

import Camp from '../models/Camp.js';
import User from '../models/User.js';
import { catchAsync } from '../middleware/error.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { getSocketService } from '../services/socket.service.js';
import { getRoutingService } from '../services/routing.service.js';

const CAMP_INCLUDE = { model: Camp, as: 'fromCamp', attributes: ['id', 'name', 'latitude', 'longitude'] };
const TO_CAMP_INCLUDE = { model: Camp, as: 'toCamp', attributes: ['id', 'name', 'latitude', 'longitude'] };
const REQUEST_INCLUDE = { model: Request, as: 'request', attributes: ['id', 'itemName', 'category', 'urgency', 'quantityNeeded', 'quantityFulfilled'] };
const ASSIGNEE_INCLUDE = { model: User, as: 'assignedTo', attributes: ['id', 'name', 'email', 'phone'] };
const CREATOR_INCLUDE = { model: User, as: 'createdBy', attributes: ['id', 'name', 'email'] };

export const getTransfers = catchAsync(async (req, res) => {
  const { fromCampId, toCampId, requestId, status, priority, page = 1, limit = 20 } = req.query;

  const where = {};
  if (fromCampId) where.fromCampId = fromCampId;
  if (toCampId) where.toCampId = toCampId;
  if (requestId) where.requestId = requestId;
  if (status) where.status = status;
  if (priority) where.priority = priority;

  // Coordinator access control - can see transfers for their camp
  if (req.user.role === 'coordinator' && req.user.campId) {
    where[Op.or] = [
      { fromCampId: req.user.campId },
      { toCampId: req.user.campId }
    ];
  }

  // Dispatcher sees all, but can filter
  // Admin sees all

  const skip = (page - 1) * limit;
  const transfers = await Transfer.findAll({
    where,
    include: [CAMP_INCLUDE, TO_CAMP_INCLUDE, REQUEST_INCLUDE, ASSIGNEE_INCLUDE],
    offset: skip,
    limit: parseInt(limit),
    order: [['priority', 'DESC'], ['createdAt', 'DESC']]
  });

  const total = await Transfer.count({ where });

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
  const transfer = await Transfer.findByPk(req.params.id, {
    include: [CAMP_INCLUDE, TO_CAMP_INCLUDE, REQUEST_INCLUDE, ASSIGNEE_INCLUDE, CREATOR_INCLUDE]
  });

  if (!transfer) {
    throw new AppError('Transfer not found', 404);
  }

  // Coordinator access control
  if (req.user.role === 'coordinator' && req.user.campId) {
    if (transfer.fromCampId !== req.user.campId && transfer.toCampId !== req.user.campId) {
      throw new AppError('Access denied', 403);
    }
  }

  res.json({
    success: true,
    data: { transfer }
  });
});

export const assignTransfer = catchAsync(async (req, res) => {
  const transfer = await Transfer.findByPk(req.params.id, {
    include: [CAMP_INCLUDE, TO_CAMP_INCLUDE, REQUEST_INCLUDE]
  });

  if (!transfer) {
    throw new AppError('Transfer not found', 404);
  }

  if (transfer.status !== 'proposed') {
    throw new AppError(`Cannot assign transfer with status: ${transfer.status}`, 400);
  }

  // Verify assigned user exists and is a dispatcher or admin
  const assignee = await User.findByPk(req.body.assignedToId);
  if (!assignee || !['dispatcher', 'admin'].includes(assignee.role)) {
    throw new AppError('Invalid assignee. Must be a dispatcher or admin.', 400);
  }

  // Verify fromCamp still has the inventory
  const inventory = await InventoryItem.findOne({
    where: {
      campId: transfer.fromCampId,
      category: transfer.category,
      itemName: transfer.itemName
    }
  });

  const surplus = inventory ? inventory.getSurplusQuantity() : 0;
  if (!inventory || surplus < transfer.quantity) {
    throw new AppError('Insufficient surplus at source camp. Transfer may be invalid.', 400);
  }

  // Reserve the quantity so concurrent matches cannot overallocate
  await InventoryItem.increment({ reservedQuantity: transfer.quantity }, {
    where: { id: inventory.id }
  });

  // Re-check after reservation (another process may have reserved between find and increment)
  const refreshed = await InventoryItem.findByPk(inventory.id);
  if (refreshed.getSurplusQuantity() < transfer.quantity) {
    // Release the reservation we just took
    await InventoryItem.decrement({ reservedQuantity: transfer.quantity }, { where: { id: inventory.id } });
    throw new AppError('Insufficient surplus at source camp. Transfer may be invalid.', 400);
  }

  transfer.status = 'assigned';
  transfer.assignedTo = assignee.id;
  transfer.assignedAt = new Date();
  await transfer.save();

  const populatedTransfer = await Transfer.findByPk(transfer.id, {
    include: [CAMP_INCLUDE, TO_CAMP_INCLUDE, REQUEST_INCLUDE, ASSIGNEE_INCLUDE]
  });

  const socketService = getSocketService();
  socketService.emitToCamp(transfer.fromCampId, 'transfer:updated', populatedTransfer);
  socketService.emitToCamp(transfer.toCampId, 'transfer:updated', populatedTransfer);
  socketService.emitToUser(assignee.id, 'transfer:assigned', populatedTransfer);
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

  const transfer = await Transfer.findByPk(req.params.id, {
    include: [CAMP_INCLUDE, TO_CAMP_INCLUDE, REQUEST_INCLUDE]
  });

  if (!transfer) {
    throw new AppError('Transfer not found', 404);
  }

  // Authorization checks
  const isAssignedDispatcher = transfer.assignedTo === req.userId;
  const isAdmin = req.user.role === 'admin';
  const isFromCampCoordinator = req.user.role === 'coordinator' && req.user.campId === transfer.fromCampId;
  const isToCampCoordinator = req.user.role === 'coordinator' && req.user.campId === transfer.toCampId;

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
    // Release reservation and decrement fromCamp inventory
    const fromInventory = await InventoryItem.findOne({
      where: {
        campId: transfer.fromCampId,
        category: transfer.category,
        itemName: transfer.itemName
      }
    });

    if (fromInventory) {
      fromInventory.quantity = Math.max(0, fromInventory.quantity - transfer.quantity);
      fromInventory.reservedQuantity = Math.max(0, fromInventory.reservedQuantity - transfer.quantity);
      fromInventory.lastUpdatedBy = req.userId;
      await fromInventory.save();
    }

    transfer.dispatchedAt = new Date();
  }

  if (status === 'delivered' && previousStatus === 'in_transit') {
    // Increment toCamp inventory
    let toInventory = await InventoryItem.findOne({
      where: {
        campId: transfer.toCampId,
        category: transfer.category,
        itemName: transfer.itemName
      }
    });

    if (toInventory) {
      const prevQty = toInventory.quantity;
      toInventory.quantity = prevQty + transfer.quantity;
      toInventory.lastUpdatedBy = req.userId;
      await toInventory.save();
    } else {
      // Create new inventory item at destination
      toInventory = await InventoryItem.create({
        campId: transfer.toCampId,
        category: transfer.category,
        itemName: transfer.itemName,
        quantity: transfer.quantity,
        unit: transfer.unit,
        minimumThreshold: 10,
        lastUpdatedBy: req.userId
      });
    }

    // Update request fulfillment
    const request = await Request.findByPk(transfer.requestId);
    if (request) {
      request.quantityFulfilled = request.getQuantityRemaining() > 0
        ? request.quantityNeeded - (request.getQuantityRemaining() - transfer.quantity)
        : request.quantityFulfilled + transfer.quantity;
      await request.save();
    }

    transfer.deliveredAt = new Date();
  }

  if (status === 'cancelled') {
    transfer.cancelledAt = new Date();
    transfer.cancellationReason = cancellationReason || 'Cancelled by user';

    // Release any remaining reservation
    const fromInventoryCancel = await InventoryItem.findOne({
      where: {
        campId: transfer.fromCampId,
        category: transfer.category,
        itemName: transfer.itemName
      }
    });

    if (fromInventoryCancel) {
      fromInventoryCancel.reservedQuantity = Math.max(0, fromInventoryCancel.reservedQuantity - transfer.quantity);
      fromInventoryCancel.lastUpdatedBy = req.userId;
      await fromInventoryCancel.save();
    }

    // If was in_transit, we need to handle the inventory that was already deducted
    if (previousStatus === 'in_transit') {
      // Return inventory to fromCamp (it never left or returned)
      const fromInventory = await InventoryItem.findOne({
        where: {
          campId: transfer.fromCampId,
          category: transfer.category,
          itemName: transfer.itemName
        }
      });

      if (fromInventory) {
        fromInventory.quantity = fromInventory.quantity + transfer.quantity;
        fromInventory.lastUpdatedBy = req.userId;
        await fromInventory.save();
      }
    }
  }

  if (status === 'failed') {
    // Similar to cancelled but marked as failed delivery
    transfer.cancellationReason = cancellationReason || 'Delivery failed';

    // Release any remaining reservation
    const fromInventoryFail = await InventoryItem.findOne({
      where: {
        campId: transfer.fromCampId,
        category: transfer.category,
        itemName: transfer.itemName
      }
    });

    if (fromInventoryFail) {
      fromInventoryFail.reservedQuantity = Math.max(0, fromInventoryFail.reservedQuantity - transfer.quantity);
      fromInventoryFail.lastUpdatedBy = req.userId;
      await fromInventoryFail.save();
    }

    // Return inventory to fromCamp
    const fromInventory = await InventoryItem.findOne({
      where: {
        campId: transfer.fromCampId,
        category: transfer.category,
        itemName: transfer.itemName
      }
    });

    if (fromInventory) {
      fromInventory.quantity = fromInventory.quantity + transfer.quantity;
      fromInventory.lastUpdatedBy = req.userId;
      await fromInventory.save();
    }
  }

  await transfer.save();

  const populatedTransfer = await Transfer.findByPk(transfer.id, {
    include: [CAMP_INCLUDE, TO_CAMP_INCLUDE, REQUEST_INCLUDE, ASSIGNEE_INCLUDE]
  });

  const socketService = getSocketService();
  socketService.emitToCamp(transfer.fromCampId, 'transfer:updated', populatedTransfer);
  socketService.emitToCamp(transfer.toCampId, 'transfer:updated', populatedTransfer);
  if (transfer.assignedTo) {
    socketService.emitToUser(transfer.assignedTo, 'transfer:updated', populatedTransfer);
  }
  socketService.emitToAdmins('transfer:updated', populatedTransfer);
  socketService.emitToDispatchers('transfer:updated', populatedTransfer);

  // Trigger matching re-check after delivery/cancellation
  if (['delivered', 'cancelled', 'failed'].includes(status)) {
    socketService.emitToMatchingEngine('transfer:completed', {
      campId: transfer.fromCampId,
      category: transfer.category,
      itemName: transfer.itemName
    });
    socketService.emitToMatchingEngine('transfer:completed', {
      campId: transfer.toCampId,
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
  const transfer = await Transfer.findByPk(req.params.id);

  if (!transfer) {
    throw new AppError('Transfer not found', 404);
  }

  if (transfer.status !== 'proposed' && transfer.status !== 'cancelled') {
    throw new AppError('Can only delete proposed or cancelled transfers', 400);
  }

  await Transfer.destroy({ where: { id: req.params.id } });

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
    match[Op.or] = [{ fromCampId: campId }, { toCampId: campId }];
  }
  if (req.user.role === 'coordinator' && req.user.campId) {
    match[Op.or] = [
      { fromCampId: req.user.campId },
      { toCampId: req.user.campId }
    ];
  }

  const [byStatus, byPriority, totalDelivered, totalQuantity] = await Promise.all([
    Transfer.findAll({
      attributes: ['status', [Sequelize.fn('COUNT', '*'), 'count']],
      where: match,
      group: ['status'],
      raw: true
    }),
    Transfer.findAll({
      attributes: ['priority', [Sequelize.fn('COUNT', '*'), 'count']],
      where: match,
      group: ['priority'],
      raw: true
    }),
    Transfer.count({ where: { ...match, status: 'delivered' } }),
    Transfer.findAll({
      attributes: [[Sequelize.fn('SUM', Sequelize.col('quantity')), 'totalQuantity']],
      where: { ...match, status: 'delivered' },
      raw: true
    })
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
    Camp.findByPk(fromCampId),
    Camp.findByPk(toCampId)
  ]);

  if (!fromCamp || !toCamp) {
    throw new AppError('Source or destination camp not found', 404);
  }

  // Verify request if provided
  let request = null;
  if (requestId) {
    request = await Request.findByPk(requestId);
    if (!request) {
      throw new AppError('Request not found', 404);
    }
  }

  // Verify source has inventory
  const inventory = await InventoryItem.findOne({
    where: {
      campId: fromCampId,
      category,
      itemName
    }
  });

  const surplus = inventory ? inventory.getSurplusQuantity() : 0;
  if (!inventory || surplus < quantity) {
    throw new AppError('Insufficient surplus at source camp', 400);
  }

  // Reserve the quantity so concurrent matches cannot overallocate
  await InventoryItem.increment({ reservedQuantity: quantity }, {
    where: { id: inventory.id }
  });

  // Re-check after reservation
  const refreshed = await InventoryItem.findByPk(inventory.id);
  if (refreshed.getSurplusQuantity() < quantity) {
    await InventoryItem.decrement({ reservedQuantity: quantity }, { where: { id: inventory.id } });
    throw new AppError('Insufficient surplus at source camp', 400);
  }

  // Get route
  const routingService = getRoutingService();
  const route = await routingService.getRoute(
    fromCamp.latitude, fromCamp.longitude,
    toCamp.latitude, toCamp.longitude
  );

  const transfer = await Transfer.create({
    fromCampId,
    toCampId,
    requestId: request ? request.id : null,
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

  const populatedTransfer = await Transfer.findByPk(transfer.id, {
    include: [CAMP_INCLUDE, TO_CAMP_INCLUDE, REQUEST_INCLUDE, CREATOR_INCLUDE]
  });

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
