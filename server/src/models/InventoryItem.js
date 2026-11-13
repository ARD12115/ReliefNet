import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema({
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
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  unit: {
    type: String,
    enum: ['units', 'kg', 'liters', 'boxes', 'packs', 'bottles', 'rolls', 'meters'],
    default: 'units'
  },
  minimumThreshold: {
    type: Number,
    default: 10,
    min: 0
  },
  expiryDate: {
    type: Date
  },
  batchNumber: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  lastUpdatedBy: {
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

inventoryItemSchema.index({ campId: 1, category: 1, itemName: 1 }, { unique: true });

inventoryItemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

inventoryItemSchema.virtual('isLowStock').get(function() {
  return this.quantity <= this.minimumThreshold;
});

inventoryItemSchema.virtual('isOutOfStock').get(function() {
  return this.quantity === 0;
});

inventoryItemSchema.virtual('surplusQuantity').get(function() {
  return Math.max(0, this.quantity - this.minimumThreshold);
});

inventoryItemSchema.set('toJSON', { virtuals: true });
inventoryItemSchema.set('toObject', { virtuals: true });

export default mongoose.model('InventoryItem', inventoryItemSchema);