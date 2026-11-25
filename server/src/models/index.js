import { sequelize } from '../config/db.js';
import User from './User.js';
import Camp from './Camp.js';
import InventoryItem from './InventoryItem.js';
import Request from './Request.js';
import Transfer from './Transfer.js';
import InventoryHistory from './InventoryHistory.js';
import UserSession from './UserSession.js';
import CampMembership from './CampMembership.js';

// Associations (replace Mongoose populate)
Camp.belongsTo(User, { foreignKey: 'managedBy', as: 'managedBy' });
User.hasMany(Camp, { foreignKey: 'managedBy', as: 'managedCamps' });

InventoryItem.belongsTo(Camp, { foreignKey: 'campId', as: 'camp' });
InventoryItem.belongsTo(User, { foreignKey: 'lastUpdatedBy', as: 'lastUpdatedBy' });
Camp.hasMany(InventoryItem, { foreignKey: 'campId', as: 'inventoryItems' });

Request.belongsTo(Camp, { foreignKey: 'campId', as: 'camp' });
Request.belongsTo(User, { foreignKey: 'requestedBy', as: 'requestedBy' });
Camp.hasMany(Request, { foreignKey: 'campId', as: 'requests' });

Transfer.belongsTo(Camp, { foreignKey: 'fromCampId', as: 'fromCamp' });
Transfer.belongsTo(Camp, { foreignKey: 'toCampId', as: 'toCamp' });
Transfer.belongsTo(Request, { foreignKey: 'requestId', as: 'request' });
Transfer.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignedTo' });
Transfer.belongsTo(User, { foreignKey: 'createdBy', as: 'createdBy' });
Camp.hasMany(Transfer, { foreignKey: 'fromCampId', as: 'transfersFrom' });
Camp.hasMany(Transfer, { foreignKey: 'toCampId', as: 'transfersTo' });
Request.hasMany(Transfer, { foreignKey: 'requestId', as: 'transfers' });

User.hasMany(InventoryItem, { foreignKey: 'lastUpdatedBy', as: 'updatedItems' });
User.hasMany(Request, { foreignKey: 'requestedBy', as: 'requests' });
User.hasMany(Transfer, { foreignKey: 'assignedTo', as: 'assignedTransfers' });
User.hasMany(Transfer, { foreignKey: 'createdBy', as: 'createdTransfers' });

// UserSession associations
User.hasMany(UserSession, { foreignKey: 'userId', as: 'sessions' });
UserSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// CampMembership associations
User.hasMany(CampMembership, { foreignKey: 'userId', as: 'campMemberships' });
CampMembership.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Camp.hasMany(CampMembership, { foreignKey: 'campId', as: 'members' });
CampMembership.belongsTo(Camp, { foreignKey: 'campId', as: 'camp' });

// InventoryHistory associations
InventoryItem.hasMany(InventoryHistory, { foreignKey: 'inventoryItemId', as: 'history' });
InventoryHistory.belongsTo(InventoryItem, { foreignKey: 'inventoryItemId', as: 'inventoryItem' });
InventoryHistory.belongsTo(Camp, { foreignKey: 'campId', as: 'camp' });
InventoryHistory.belongsTo(User, { foreignKey: 'performedBy', as: 'performedBy' });
User.hasMany(InventoryHistory, { foreignKey: 'performedBy', as: 'performedInventoryActions' });
Camp.hasMany(InventoryHistory, { foreignKey: 'campId', as: 'inventoryHistory' });

export {
  sequelize,
  User,
  Camp,
  InventoryItem,
  InventoryHistory,
  Request,
  Transfer,
  UserSession,
  CampMembership,
};
