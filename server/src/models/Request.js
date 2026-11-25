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
  deletedAt: {
    type: DataTypes.DATE,
  },
}, {
  indexes: [
    { fields: ['campId', 'status'] },
    { fields: ['category', 'urgency', 'status'] },
    { fields: ['deletedAt'] },
  ],
  defaultScope: {
    where: { deletedAt: null },
  },
  paranoid: false,
  timestamps: true,
  updatedAt: 'updatedAt',
  createdAt: 'createdAt',
  deletedAt: 'deletedAt',
  validate: {
    fulfillmentDoesNotExceedNeed() {
      if (this.quantityFulfilled !== null && this.quantityFulfilled !== undefined &&
          this.quantityNeeded !== null && this.quantityNeeded !== undefined &&
          this.quantityFulfilled > this.quantityNeeded) {
        throw new Error('quantityFulfilled cannot exceed quantityNeeded');
      }
    },
  },
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
});

Request.prototype.getQuantityRemaining = function () {
  return Math.max(0, this.quantityNeeded - this.quantityFulfilled);
};

Request.prototype.getFulfillmentPercentage = function () {
  if (this.quantityNeeded === 0) return 100;
  return Math.min(100, Math.round((this.quantityFulfilled / this.quantityNeeded) * 100));
};

export default Request;
