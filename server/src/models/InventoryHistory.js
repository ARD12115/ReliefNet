import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const ACTIONS = [
  'create', 'update', 'delete',
  'transfer_in', 'transfer_out', 'adjust',
];

const InventoryHistory = sequelize.define('InventoryHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  inventoryItemId: {
    type: DataTypes.UUID,
    allowNull: false,
    index: true,
  },
  campId: {
    type: DataTypes.UUID,
    allowNull: false,
    index: true,
  },
  category: {
    type: DataTypes.ENUM('food', 'water', 'medicine', 'shelter', 'other', 'clothing', 'sanitation'),
    allowNull: false,
  },
  itemName: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  action: {
    type: DataTypes.ENUM(ACTIONS),
    allowNull: false,
  },
  previousQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    min: 0,
  },
  newQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    min: 0,
  },
  quantityChange: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  unit: {
    type: DataTypes.ENUM('units', 'kg', 'liters', 'boxes', 'packs', 'bottles', 'rolls', 'meters'),
    allowNull: false,
  },
  relatedTransferId: {
    type: DataTypes.UUID,
  },
  performedBy: {
    type: DataTypes.UUID,
    index: true,
  },
  notes: {
    type: DataTypes.STRING(500),
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  indexes: [
    { fields: ['inventoryItemId', 'createdAt'] },
    { fields: ['campId', 'createdAt'] },
    { fields: ['performedBy', 'createdAt'] },
    { fields: ['relatedTransferId'] },
    { fields: ['action', 'createdAt'] },
  ],
  timestamps: false,
  createdAt: 'createdAt',
});

export default InventoryHistory;
