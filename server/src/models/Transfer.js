import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const CATEGORIES = ['food', 'water', 'medicine', 'shelter', 'other', 'clothing', 'sanitation'];
const UNITS = ['units', 'kg', 'liters', 'boxes', 'packs', 'bottles', 'rolls', 'meters'];
const STATUSES = ['proposed', 'assigned', 'in_transit', 'delivered', 'cancelled', 'failed'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

const Transfer = sequelize.define('Transfer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  fromCampId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  toCampId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  requestId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  itemName: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM(CATEGORIES),
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    min: 1,
  },
  unit: {
    type: DataTypes.ENUM(UNITS),
    defaultValue: 'units',
  },
  routeDistanceKm: {
    type: DataTypes.DOUBLE,
    defaultValue: 0,
  },
  routeDurationMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  routeGeometry: {
    type: DataTypes.JSONB,
  },
  status: {
    type: DataTypes.ENUM(STATUSES),
    defaultValue: 'proposed',
  },
  priority: {
    type: DataTypes.ENUM(PRIORITIES),
    defaultValue: 'medium',
  },
  assignedTo: {
    type: DataTypes.UUID,
  },
  assignedAt: {
    type: DataTypes.DATE,
  },
  dispatchedAt: {
    type: DataTypes.DATE,
  },
  deliveredAt: {
    type: DataTypes.DATE,
  },
  cancelledAt: {
    type: DataTypes.DATE,
  },
  cancellationReason: {
    type: DataTypes.STRING(500),
  },
  notes: {
    type: DataTypes.TEXT,
  },
  createdBy: {
    type: DataTypes.UUID,
  },
  deletedAt: {
    type: DataTypes.DATE,
  },
}, {
  indexes: [
    { fields: ['fromCampId', 'status'] },
    { fields: ['toCampId', 'status'] },
    { fields: ['status', 'priority'] },
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
});

Transfer.prototype.getIsActive = function () {
  return ['proposed', 'assigned', 'in_transit'].includes(this.status);
};

export default Transfer;
