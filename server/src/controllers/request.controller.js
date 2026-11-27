import { Op, Sequelize } from 'sequelize';
import Request from '../models/Request.js';
import Camp from '../models/Camp.js';
import Transfer from '../models/Transfer.js';
import User from '../models/User.js';
import '../models/associations.js';
import { catchAsync } from '../middleware/error.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { getSocketService } from '../services/socket.service.js';

export const createRequest = catchAsync(async (req, res) => {
  const { campId, category, itemName, quantityNeeded, unit, urgency, description } = req.body;

  const camp = await Camp.findByPk(campId);
  if (!camp) {
    throw new AppError('Camp not found', 404);
  }

  if (req.user.role === 'coordinator' && req.user.campId !== campId) {
    throw new AppError('Access denied', 403);
  }

  if (camp.status === 'evacuating' || camp.status === 'evacuated') {
    throw new AppError('Cannot create requests for evacuating/evacuated camps', 400);
  }

  const request = await Request.create({
    campId,
    category,
    itemName,
    quantityNeeded,
    unit,
    urgency: urgency || 'medium',
    description,
    requestedBy: req.userId
  });

  const populatedRequest = await Request.findByPk(request.id, {
    include: [
      { model: Camp, as: 'camp', attributes: ['name', 'latitude', 'longitude'] },
      { model: User, as: 'requester', attributes: ['name', 'email'] }
    ]
  });

  const socketService = getSocketService();
  socketService.emitToCamp(campId, 'request:created', populatedRequest);
  socketService.emitToAdmins('request:created', populatedRequest);
  socketService.emitToDispatchers('request:created', populatedRequest);

  socketService.emitToMatchingEngine('request:created', {
    requestId: request.id,
    campId,
    category,
    itemName
  });

  res.status(201).json({
    success: true,
    message: 'Request created successfully',
    data: { request: populatedRequest }
  });
});

export const getRequests = catchAsync(async (req, res) => {
  const { campId, category, status, urgency, page = 1, limit = 20, search } = req.query;

  const whereClauses = [];
  if (campId) whereClauses.push({ campId });
  if (category) whereClauses.push({ category });
  if (status) whereClauses.push({ status });
  if (urgency) whereClauses.push({ urgency });
  if (search) {
    whereClauses.push({
      [Op.or]: [
        { itemName: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ]
    });
  }
  const where = whereClauses.length > 1 ? { [Op.and]: whereClauses } : (whereClauses[0] || {});

  if (req.user.role === 'coordinator' && req.user.campId) {
    where.campId = req.user.campId;
  }

  const skip = (page - 1) * limit;
  const requests = await Request.findAll({
    where,
    include: [
      { model: Camp, as: 'camp', attributes: ['name', 'latitude', 'longitude', 'status'] },
      { model: User, as: 'requester', attributes: ['name', 'email'] }
    ],
    offset: skip,
    limit: parseInt(limit),
    order: [['urgency', 'DESC'], ['createdAt', 'DESC']]
  });

  const total = await Request.count({ where });

  res.json({
    success: true,
    data: {
      requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

export const getRequest = catchAsync(async (req, res) => {
  const request = await Request.findByPk(req.params.id, {
    include: [
      { model: Camp, as: 'camp', attributes: ['name', 'latitude', 'longitude', 'status', 'contactPerson', 'contactPhone'] },
      { model: User, as: 'requestedBy', attributes: ['name', 'email', 'phone'] }
    ]
  });

  if (!request) {
    throw new AppError('Request not found', 404);
  }

  if (req.user.role === 'coordinator' && req.user.campId !== request.campId) {
    throw new AppError('Access denied', 403);
  }

  const transfers = await Transfer.findAll({
    where: { requestId: request.id },
    include: [
      { model: Camp, as: 'fromCamp', attributes: ['name', 'latitude', 'longitude'] },
      { model: Camp, as: 'toCamp', attributes: ['name', 'latitude', 'longitude'] },
      { model: User, as: 'assignedTo', attributes: ['name'] }
    ],
    order: [['createdAt', 'DESC']]
  });

  res.json({
    success: true,
    data: { request, transfers }
  });
});

export const updateRequest = catchAsync(async (req, res) => {
  const { quantityNeeded, urgency, description, status } = req.body;

  const request = await Request.findByPk(req.params.id);
  if (!request) {
    throw new AppError('Request not found', 404);
  }

  if (req.user.role === 'coordinator' && req.user.campId !== request.campId) {
    throw new AppError('Access denied', 403);
  }

  if (['fulfilled', 'cancelled'].includes(request.status)) {
    throw new AppError(`Cannot update ${request.status} request`, 400);
  }

  const updateData = {};
  if (quantityNeeded !== undefined) updateData.quantityNeeded = quantityNeeded;
  if (urgency) updateData.urgency = urgency;
  if (description !== undefined) updateData.description = description;
  if (status && req.user.role === 'admin') updateData.status = status;

  const [, [updatedRequest]] = await Request.update(updateData, {
    where: { id: req.params.id },
    returning: true,
    include: [
      { model: Camp, as: 'camp', attributes: ['name', 'latitude', 'longitude'] },
      { model: User, as: 'requestedBy', attributes: ['name', 'email'] }
    ]
  });

  const socketService = getSocketService();
  socketService.emitToCamp(request.campId, 'request:updated', updatedRequest);
  socketService.emitToAdmins('request:updated', updatedRequest);
  socketService.emitToDispatchers('request:updated', updatedRequest);

  if (quantityNeeded !== undefined || urgency) {
    socketService.emitToMatchingEngine('request:updated', {
      requestId: request.id,
      campId: request.campId,
      category: request.category,
      itemName: request.itemName
    });
  }

  res.json({
    success: true,
    message: 'Request updated',
    data: { request: updatedRequest }
  });
});

export const cancelRequest = catchAsync(async (req, res) => {
  const { reason } = req.body;

  const request = await Request.findByPk(req.params.id);
  if (!request) {
    throw new AppError('Request not found', 404);
  }

  if (req.user.role === 'coordinator' && req.user.campId !== request.campId) {
    throw new AppError('Access denied', 403);
  }

  if (['fulfilled', 'cancelled'].includes(request.status)) {
    throw new AppError(`Request is already ${request.status}`, 400);
  }

  const activeTransfers = await Transfer.findAll({
    where: {
      requestId: request.id,
      status: { [Op.in]: ['proposed', 'assigned', 'in_transit'] }
    }
  });

  if (activeTransfers.length > 0) {
    throw new AppError('Cannot cancel request with active transfers. Cancel transfers first.', 400);
  }

  request.status = 'cancelled';
  request.description = request.description
    ? `${request.description}\n\nCancelled: ${reason}`
    : `Cancelled: ${reason}`;
  await request.save();

  const populatedRequest = await Request.findByPk(request.id, {
    include: [
      { model: Camp, as: 'camp', attributes: ['name', 'latitude', 'longitude'] },
      { model: User, as: 'requestedBy', attributes: ['name', 'email'] }
    ]
  });

  const socketService = getSocketService();
  socketService.emitToCamp(request.campId, 'request:updated', populatedRequest);
  socketService.emitToAdmins('request:updated', populatedRequest);
  socketService.emitToDispatchers('request:updated', populatedRequest);

  socketService.emitToMatchingEngine('request:cancelled', {
    campId: request.campId,
    category: request.category,
    itemName: request.itemName
  });

  res.json({
    success: true,
    message: 'Request cancelled',
    data: { request: populatedRequest }
  });
});

export const getRequestStats = catchAsync(async (req, res) => {
  const { campId } = req.query;

  const match = {};
  if (campId) match.campId = campId;
  if (req.user.role === 'coordinator' && req.user.campId) {
    match.campId = req.user.campId;
  }

  const [byStatus, byUrgency, byCategory, totalOpen, totalFulfilled] = await Promise.all([
    Request.findAll({
      attributes: ['status', [Sequelize.fn('COUNT', '*'), 'count']],
      where: match,
      group: ['status'],
      raw: true
    }),
    Request.findAll({
      attributes: ['urgency', [Sequelize.fn('COUNT', '*'), 'count']],
      where: match,
      group: ['urgency'],
      raw: true
    }),
    Request.findAll({
      attributes: ['category', [Sequelize.fn('COUNT', '*'), 'count'], [Sequelize.fn('SUM', Sequelize.col('quantityNeeded')), 'totalNeeded']],
      where: match,
      group: ['category'],
      raw: true
    }),
    Request.count({ where: { ...match, status: { [Op.in]: ['open', 'partial', 'matched'] } } }),
    Request.count({ where: { ...match, status: 'fulfilled' } })
  ]);

  res.json({
    success: true,
    data: {
      byStatus,
      byUrgency,
      byCategory,
      totalOpen,
      totalFulfilled
    }
  });
});
