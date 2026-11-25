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
  deletedAt: {
    type: DataTypes.DATE,
  },
}, {
  indexes: [
    { fields: ['latitude', 'longitude'] },
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
    populationWithinCapacity() {
      if (this.currentPopulation !== null && this.currentPopulation !== undefined &&
          this.capacity !== null && this.capacity !== undefined &&
          this.currentPopulation > this.capacity) {
        throw new Error('currentPopulation cannot exceed capacity');
      }
    },
  },
});

Camp.prototype.getLat = function () {
  return this.latitude;
};

Camp.prototype.getLng = function () {
  return this.longitude;
};

export default Camp;
