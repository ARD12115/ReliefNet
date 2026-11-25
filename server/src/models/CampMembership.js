import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const CampMembership = sequelize.define('CampMembership', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    index: true,
  },
  campId: {
    type: DataTypes.UUID,
    allowNull: false,
    index: true,
  },
  roleAtCamp: {
    type: DataTypes.ENUM('coordinator', 'dispatcher', 'admin'),
    allowNull: false,
    defaultValue: 'coordinator',
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  endedAt: {
    type: DataTypes.DATE,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  indexes: [
    { fields: ['userId', 'campId'], unique: true },
    { fields: ['campId', 'roleAtCamp'] },
    { fields: ['startedAt', 'endedAt'] },
  ],
  timestamps: false,
  createdAt: 'createdAt',
});

export default CampMembership;
