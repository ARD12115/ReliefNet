import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import { sequelize } from '../config/db.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('coordinator', 'dispatcher', 'admin'),
    defaultValue: 'coordinator',
  },
  campId: {
    type: DataTypes.UUID,
  },
  phone: {
    type: DataTypes.STRING,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  lastLoginAt: {
    type: DataTypes.DATE,
  },
  refreshToken: {
    type: DataTypes.TEXT,
  },
  tokenVersion: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  hooks: {
    beforeSave: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(user.password, salt);
      }
      user.updatedAt = new Date();
    },
    beforeCreate: (user) => {
      user.updatedAt = new Date();
    },
    beforeUpdate: (user) => {
      user.updatedAt = new Date();
    },
  },
  defaultScope: {
    attributes: { exclude: ['password', 'refreshToken'] },
  },
  indexes: [{ fields: ['email'], unique: true }],
  timestamps: true,
  updatedAt: 'updatedAt',
  createdAt: 'createdAt',
});

export default User;
