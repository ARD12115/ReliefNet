import Request from '../models/Request.js';
import Camp from '../models/Camp.js';
import InventoryItem from '../models/InventoryItem.js';
import Transfer from '../models/Transfer.js';
import { catchAsync } from '../middleware/error.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { getSocketService } from '../services/socket.service.js';

export const createRequest = catchAsync(async (req, res) => {
  const { campId, category, itemName, quantityNeeded, unit, urgency, description } = req.body;
  
  // Verify camp exists and user has access
  const camp = await Camp.findById(campId);
  if (!camp) {
    throw new AppError('Camp not found', 404);
  }
  
  if (req.user.role === 'coordinator' && req.user.campId?.toString() !== campId) {
    throw new AppError('Access denied', 403);
  }
  
  // Check if camp is evacuating
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
  
  const populatedRequest = await Request.findById(request._id)
    .populate('campId', 'name location')
    .populate('requestedBy', 'name email');
  
  const socketService = getSocketService();
  socketService.emitToCamp(campId, 'request:created', populatedRequest);
  socketService.emitToAdmins('request:created', populatedRequest);
  socketService.emitToDispatchers('request:created', populatedRequest);
  
  // Trigger immediate matching check
  socketService.emitToMatchingEngine('request:created', { 
    requestId: request._id, 
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
  
  const query = {};
  if (campId) query.campId = campId;
  if (category) query.category = category;
  if (status) query.status = status;
  if (urgency) query.urgency = urgency;
  if (search) {
    query.$or = [
      { itemName: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  
  // Coordinator access control
  if (req.user.role === 'coordinator' && req.user.campId) {
    query.campId = req.user.campId;
  }
  
  const skip = (page - 1) * limit;
  const requests = await Request.find(query)
    .populate('campId', 'name location status')
    .populate('requestedBy', 'name email')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ urgency: -1, createdAt: -1 });
  
  const total = await Request.countDocuments(query);
  
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
  const request = await Request.findById(req.params.id)
    .populate('campId', 'name location status contactPerson contactPhone')
    .populate('requestedBy', 'name email phone');
  
  if (!request) {
    throw new AppError('Request not found', 404);
  }
  
  // Coordinator access control
  if (req.user.role === 'coordinator' && req.user.campId?.toString() !== request.campId._id.toString()) {
    throw new AppError('Access denied', 403);
  }
  
  // Get related transfers
  const transfers = await Transfer.find({ requestId: request._id })
    .populate('fromCampId', 'name location')
    .populate('toCampId', 'name location')
    .populate('assignedTo', 'name')
    .sort({ createdAt: -1 });
  
  res.json({
    success: true,
    data: { request, transfers }
  });
});

export const updateRequest = catchAsync(async (req, res) => {
  const { quantityNeeded, urgency, description, status } = req.body;
  
  const request = await Request.findById(req.params.id);
  if (!request) {
    throw new AppError('Request not found', 404);
  }
  
  if (req.user.role === 'coordinator' && req.user.campId?.toString() !== request.campId.toString()) {
    throw new AppError('Access denied', 403);
  }
  
  // Prevent updating fulfilled/cancelled requests
  if (['fulfilled', 'cancelled'].includes(request.status)) {
    throw new AppError(`Cannot update ${request.status} request`, 400);
  }
  
  const updateData = {};
  if (quantityNeeded !== undefined) updateData.quantityNeeded = quantityNeeded;
  if (urgency) updateData.urgency = urgency;
  if (description !== undefined) updateData.description = description;
  if (status && req.user.role === 'admin') updateData.status = status; // Only admin can manually change status
  
  const updatedRequest = await Request.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).populate('campId', 'name location').populate('requestedBy', 'name email');
  
  const socketService = getSocketService();
  socketService.emitToCamp(request.campId, 'request:updated', updatedRequest);
  socketService.emitToAdmins('request:updated', updatedRequest);
  socketService.emitToDispatchers('request:updated', updatedRequest);
  
  // Trigger matching if quantity/urgency changed
  if (quantityNeeded !== undefined || urgency) {
    socketService.emitToMatchingEngine('request:updated', { 
      requestId: request._id, 
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
  
  const request = await Request.findById(req.params.id);
  if (!request) {
    throw new AppError('Request not found', 404);
  }
  
  if (req.user.role === 'coordinator' && req.user.campId?.toString() !== request.campId.toString()) {
    throw new AppError('Access denied', 403);
  }
  
  if (['fulfilled', 'cancelled'].includes(request.status)) {
    throw new AppError(`Request is already ${request.status}`, 400);
  }
  
  // Check if there are active transfers for this request
  const activeTransfers = await Transfer.find({
    requestId: request._id,
    status: { $in: ['proposed', 'assigned', 'in_transit'] }
  });
  
  if (activeTransfers.length > 0) {
    throw new AppError('Cannot cancel request with active transfers. Cancel transfers first.', 400);
  }
  
  request.status = 'cancelled';
  request.description = request.description ? `${request.description}\n\nCancelled: ${reason}` : `Cancelled: ${reason}`;
  await request.save();
  
  const populatedRequest = await Request.findById(request._id)
    .populate('campId', 'name location')
    .populate('requestedBy', 'name email');
  
  const socketService = getSocketService();
  socketService.emitToCamp(request.campId, 'request:updated', populatedRequest);
  socketService.emitToAdmins('request:updated', populatedRequest);
  socketService.emitToDispatchers('request:updated', populatedRequest);
  
  // Trigger re-matching since this request is now cancelled
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
    Request.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    Request.aggregate([
      { $match: match },
      { $group: { _id: '$urgency', count: { $sum: 1 } } }
    ]),
    Request.aggregate([
      { $match: match },
      { $group: { _id: '$category', count: { $sum: 1 }, totalNeeded: { $sum: '$quantityNeeded' } } }
    ]),
    Request.countDocuments({ ...match, status: { $in: ['open', 'partial', 'matched'] } }),
    Request.countDocuments({ ...match, status: 'fulfilled' })
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