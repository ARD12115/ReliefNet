import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Camp = sequelize.define('Camp', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  latitude: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  longitude: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING(200),
  },
  capacity: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    min: 0,
  },
  currentPopulation: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    min: 0,
  },
  contactPerson: {
    type: DataTypes.STRING(100),
  },
  contactPhone: {
    type: DataTypes.STRING,
  },
  contactEmail: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'full', 'evacuated', 'evacuating'),
    defaultValue: 'active',
  },
  managedBy: {
    type: DataTypes.UUID,
  },
}, {
  indexes: [{ fields: ['latitude', 'longitude'] }],
  timestamps: true,
  updatedAt: 'updatedAt',
  createdAt: 'createdAt',
});

Camp.prototype.getLat = function () {
  return this.latitude;
};

Camp.prototype.getLng = function () {
  return this.longitude;
};

export default Camp;
