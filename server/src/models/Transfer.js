import mongoose from 'mongoose';

const transferSchema = new mongoose.Schema({
  fromCampId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Camp',
    required: true,
    index: true
  },
  toCampId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Camp',
    required: true,
    index: true
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    required: true,
    index: true
  },
  itemName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  category: {
    type: String,
    enum: ['food', 'water', 'medicine', 'shelter', 'other', 'clothing', 'sanitation'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unit: {
    type: String,
    enum: ['units', 'kg', 'liters', 'boxes', 'packs', 'bottles', 'rolls', 'meters'],
    default: 'units'
  },
  routeDistanceKm: {
    type: Number,
    default: 0
  },
  routeDurationMinutes: {
    type: Number,
    default: 0
  },
  routeGeometry: {
    type: {
      type: String,
      enum: ['LineString']
    },
    coordinates: [[Number]] // GeoJSON LineString
  },
  status: {
    type: String,
    enum: ['proposed', 'assigned', 'in_transit', 'delivered', 'cancelled', 'failed'],
    default: 'proposed',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: {
    type: Date
  },
  dispatchedAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  cancellationReason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

transferSchema.index({ fromCampId: 1, status: 1 });
transferSchema.index({ toCampId: 1, status: 1 });
transferSchema.index({ status: 1, priority: 1 });

transferSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

transferSchema.virtual('isActive').get(function() {
  return ['proposed', 'assigned', 'in_transit'].includes(this.status);
});

transferSchema.set('toJSON', { virtuals: true });
transferSchema.set('toObject', { virtuals: true });

export default mongoose.model('Transfer', transferSchema);