import mongoose from 'mongoose';

const inventoryHistorySchema = new mongoose.Schema({
  inventoryItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: true,
    index: true
  },
  campId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Camp',
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ['food', 'water', 'medicine', 'shelter', 'clothing', 'sanitation', 'other'],
    required: true
  },
  itemName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  action: {
    type: String,
    enum: ['created', 'updated', 'transfer_out', 'transfer_in', 'consumed', 'restocked', 'adjusted', 'expired'],
    required: true
  },
  previousQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  newQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  quantityChange: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    enum: ['units', 'kg', 'liters', 'boxes', 'packs', 'bottles', 'rolls', 'meters'],
    default: 'units'
  },
  relatedTransferId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transfer'
  },
  relatedRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request'
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

inventoryHistorySchema.index({ inventoryItemId: 1, createdAt: -1 });
inventoryHistorySchema.index({ campId: 1, createdAt: -1 });

export default mongoose.model('InventoryHistory', inventoryHistorySchema);