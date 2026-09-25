import mongoose from 'mongoose';

const campSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      index: '2dsphere'
    },
    address: String
  },
  capacity: {
    type: Number,
    default: 0,
    min: 0
  },
  currentPopulation: {
    type: Number,
    default: 0,
    min: 0
  },
  contactPerson: {
    type: String,
    trim: true
  },
  contactPhone: {
    type: String,
    trim: true
  },
  contactEmail: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'full', 'evacuated', 'evacuating'],
    default: 'active'
  },
  managedBy: {
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

campSchema.index({ 'location.coordinates': '2dsphere' });

campSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

campSchema.virtual('lat').get(function() {
  return this.location?.coordinates?.[1];
});

campSchema.virtual('lng').get(function() {
  return this.location?.coordinates?.[0];
});

campSchema.set('toJSON', { virtuals: true });
campSchema.set('toObject', { virtuals: true });

export default mongoose.model('Camp', campSchema);