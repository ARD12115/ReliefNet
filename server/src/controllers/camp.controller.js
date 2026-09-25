import Camp from '../models/Camp.js';
import InventoryItem from '../models/InventoryItem.js';
import Request from '../models/Request.js';
import Transfer from '../models/Transfer.js';
import { catchAsync } from '../middleware/error.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { getSocketService } from '../services/socket.service.js';

export const createCamp = catchAsync(async (req, res) => {
  const { name, location, capacity, contactPerson, contactPhone, contactEmail, address } = req.body;
  
  const camp = await Camp.create({
    name,
    location: {
      type: 'Point',
      coordinates: [location.lng, location.lat],
      address
    },
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
  
  const query = {};
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { 'location.address': { $regex: search, $options: 'i' } }
    ];
  }
  
  // Non-admin users only see their assigned camp
  if (req.user.role === 'coordinator' && req.user.campId) {
    query._id = req.user.campId;
  }
  
  const skip = (page - 1) * limit;
  const camps = await Camp.find(query)
    .populate('managedBy', 'name email')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });
  
  const total = await Camp.countDocuments(query);
  
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
  const camp = await Camp.findById(req.params.id)
    .populate('managedBy', 'name email phone');
  
  if (!camp) {
    throw new AppError('Camp not found', 404);
  }
  
  // Check access for coordinators
  if (req.user.role === 'coordinator' && req.user.campId?.toString() !== camp._id.toString()) {
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
  if (location) updateData.location = {
    type: 'Point',
    coordinates: [location.lng, location.lat],
    address: address || ''
  };
  if (capacity !== undefined) updateData.capacity = capacity;
  if (currentPopulation !== undefined) updateData.currentPopulation = currentPopulation;
  if (contactPerson) updateData.contactPerson = contactPerson;
  if (contactPhone) updateData.contactPhone = contactPhone;
  if (contactEmail) updateData.contactEmail = contactEmail;
  if (status) updateData.status = status;
  
  const camp = await Camp.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).populate('managedBy', 'name email');
  
  if (!camp) {
    throw new AppError('Camp not found', 404);
  }
  
  const socketService = getSocketService();
  socketService.emitToCamp(camp._id, 'camp:updated', camp);
  socketService.emitToAdmins('camp:updated', camp);
  
  res.json({
    success: true,
    message: 'Camp updated successfully',
    data: { camp }
  });
});

export const deleteCamp = catchAsync(async (req, res) => {
  const camp = await Camp.findByIdAndDelete(req.params.id);
  
  if (!camp) {
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
  
  const camps = await Camp.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)]
        },
        $maxDistance: parseInt(radius)
      }
    },
    status: 'active'
  }).limit(20);
  
  res.json({
    success: true,
    data: { camps }
  });
});

export const getCampStats = catchAsync(async (req, res) => {
  const campId = req.params.id;
  
  const [inventoryCount, requestCount, transferOutCount, transferInCount] = await Promise.all([
    InventoryItem.countDocuments({ campId }),
    Request.countDocuments({ campId }),
    Transfer.countDocuments({ fromCampId: campId }),
    Transfer.countDocuments({ toCampId: campId })
  ]);
  
  const inventoryByCategory = await InventoryItem.aggregate([
    { $match: { campId: campId } },
    { $group: { _id: '$category', totalQuantity: { $sum: '$quantity' }, itemCount: { $sum: 1 } } }
  ]);
  
  const requestsByStatus = await Request.aggregate([
    { $match: { campId: campId } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
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