import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const UserSession = sequelize.define('UserSession', {
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
  deviceFingerprint: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  ipAddress: {
    type: DataTypes.STRING(45),
  },
  refreshTokenHash: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  revokedAt: {
    type: DataTypes.DATE,
  },
  lastUsedAt: {
    type: DataTypes.DATE,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  indexes: [
    { fields: ['userId', 'revokedAt'] },
    { fields: ['expiresAt'] },
    { fields: ['refreshTokenHash'], unique: true },
  ],
  timestamps: false,
  createdAt: 'createdAt',
});

export default UserSession;
