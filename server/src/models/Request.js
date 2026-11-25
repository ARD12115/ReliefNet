import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const CATEGORIES = ['food', 'water', 'medicine', 'shelter', 'other', 'clothing', 'sanitation'];
const UNITS = ['units', 'kg', 'liters', 'boxes', 'packs', 'bottles', 'rolls', 'meters'];
const URGENCIES = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['open', 'partial', 'matched', 'fulfilled', 'cancelled'];

const Request = sequelize.define('Request', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  campId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM(CATEGORIES),
    allowNull: false,
  },
  itemName: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  quantityNeeded: {
    type: DataTypes.INTEGER,
    allowNull: false,
    min: 1,
  },
  quantityFulfilled: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    min: 0,
  },
  unit: {
    type: DataTypes.ENUM(UNITS),
    defaultValue: 'units',
  },
  urgency: {
    type: DataTypes.ENUM(URGENCIES),
    defaultValue: 'medium',
  },
  status: {
    type: DataTypes.ENUM(STATUSES),
    defaultValue: 'open',
  },
  description: {
    type: DataTypes.TEXT,
  },
  requestedBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  fulfilledAt: {
    type: DataTypes.DATE,
  },
}, {
  indexes: [
    { fields: ['campId', 'status'] },
    { fields: ['category', 'urgency', 'status'] },
  ],
  hooks: {
    beforeSave: (request) => {
      request.updatedAt = new Date();
      if (request.quantityFulfilled >= request.quantityNeeded && request.status !== 'cancelled') {
        request.status = 'fulfilled';
        request.fulfilledAt = new Date();
      } else if (request.quantityFulfilled > 0 && request.status === 'open') {
        request.status = 'partial';
      }
    },
  },
  timestamps: true,
  updatedAt: 'updatedAt',
  createdAt: 'createdAt',
});

Request.prototype.getQuantityRemaining = function () {
  return Math.max(0, this.quantityNeeded - this.quantityFulfilled);
};

Request.prototype.getFulfillmentPercentage = function () {
  if (this.quantityNeeded === 0) return 100;
  return Math.min(100, Math.round((this.quantityFulfilled / this.quantityNeeded) * 100));
};

export default Request;
