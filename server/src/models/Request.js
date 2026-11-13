import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
  campId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Camp',
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ['food', 'water', 'medicine', 'shelter', 'other', 'clothing', 'sanitation'],
    required: true,
    index: true
  },
  itemName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  quantityNeeded: {
    type: Number,
    required: true,
    min: 1
  },
  quantityFulfilled: {
    type: Number,
    default: 0,
    min: 0
  },
  unit: {
    type: String,
    enum: ['units', 'kg', 'liters', 'boxes', 'packs', 'bottles', 'rolls', 'meters'],
    default: 'units'
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  status: {
    type: String,
    enum: ['open', 'partial', 'matched', 'fulfilled', 'cancelled'],
    default: 'open',
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fulfilledAt: {
    type: Date
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

requestSchema.index({ campId: 1, status: 1 });
requestSchema.index({ category: 1, urgency: 1, status: 1 });

requestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Auto-update status based on fulfillment
  if (this.quantityFulfilled >= this.quantityNeeded && this.status !== 'cancelled') {
    this.status = 'fulfilled';
    this.fulfilledAt = new Date();
  } else if (this.quantityFulfilled > 0 && this.status === 'open') {
    this.status = 'partial';
  }
  
  next();
});

requestSchema.virtual('quantityRemaining').get(function() {
  return Math.max(0, this.quantityNeeded - this.quantityFulfilled);
});

requestSchema.virtual('fulfillmentPercentage').get(function() {
  if (this.quantityNeeded === 0) return 100;
  return Math.min(100, Math.round((this.quantityFulfilled / this.quantityNeeded) * 100));
});

requestSchema.set('toJSON', { virtuals: true });
requestSchema.set('toObject', { virtuals: true });

export default mongoose.model('Request', requestSchema);