import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const InventoryItem = sequelize.define('InventoryItem', {
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
    type: DataTypes.ENUM('food', 'water', 'medicine', 'shelter', 'other', 'clothing', 'sanitation'),
    allowNull: false,
  },
  itemName: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    min: 0,
  },
  unit: {
    type: DataTypes.ENUM('units', 'kg', 'liters', 'boxes', 'packs', 'bottles', 'rolls', 'meters'),
    defaultValue: 'units',
  },
  minimumThreshold: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    min: 0,
  },
  expiryDate: {
    type: DataTypes.DATEONLY,
  },
  batchNumber: {
    type: DataTypes.STRING(100),
  },
  notes: {
    type: DataTypes.TEXT,
  },
  lastUpdatedBy: {
    type: DataTypes.UUID,
  },
}, {
  indexes: [{ fields: ['campId', 'category', 'itemName'], unique: true }],
  timestamps: true,
  updatedAt: 'updatedAt',
  createdAt: 'createdAt',
});

InventoryItem.prototype.getIsLowStock = function () {
  return this.quantity <= this.minimumThreshold;
};

InventoryItem.prototype.getIsOutOfStock = function () {
  return this.quantity === 0;
};

InventoryItem.prototype.getSurplusQuantity = function () {
  return Math.max(0, this.quantity - this.minimumThreshold);
};

export default InventoryItem;
