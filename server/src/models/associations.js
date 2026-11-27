import Camp from './Camp.js';
import InventoryItem from './InventoryItem.js';
import Request from './Request.js';
import Transfer from './Transfer.js';
import User from './User.js';

if (!Camp.associations.manager) {
  Camp.belongsTo(User, { foreignKey: 'managedBy', as: 'manager' });
}
if (!User.associations.managedCamps) {
  User.hasMany(Camp, { foreignKey: 'managedBy', as: 'managedCamps' });
}
if (!InventoryItem.associations.camp) {
  InventoryItem.belongsTo(Camp, { foreignKey: 'campId', as: 'camp' });
}
if (!InventoryItem.associations.updater) {
  InventoryItem.belongsTo(User, { foreignKey: 'lastUpdatedBy', as: 'updater' });
}
if (!Camp.associations.inventoryItems) {
  Camp.hasMany(InventoryItem, { foreignKey: 'campId', as: 'inventoryItems' });
}
if (!Request.associations.camp) {
  Request.belongsTo(Camp, { foreignKey: 'campId', as: 'camp' });
}
if (!Request.associations.requester) {
  Request.belongsTo(User, { foreignKey: 'requestedBy', as: 'requester' });
}
if (!Camp.associations.requests) {
  Camp.hasMany(Request, { foreignKey: 'campId', as: 'requests' });
}
if (!Transfer.associations.fromCamp) {
  Transfer.belongsTo(Camp, { foreignKey: 'fromCampId', as: 'fromCamp' });
}
if (!Transfer.associations.toCamp) {
  Transfer.belongsTo(Camp, { foreignKey: 'toCampId', as: 'toCamp' });
}
if (!Transfer.associations.request) {
  Transfer.belongsTo(Request, { foreignKey: 'requestId', as: 'request' });
}
if (!Transfer.associations.assignee) {
  Transfer.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });
}
if (!Transfer.associations.creator) {
  Transfer.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
}
if (!Request.associations.transfers) {
  Request.hasMany(Transfer, { foreignKey: 'requestId', as: 'transfers' });
}
if (!Camp.associations.transfersFrom) {
  Camp.hasMany(Transfer, { foreignKey: 'fromCampId', as: 'transfersFrom' });
}
if (!Camp.associations.transfersTo) {
  Camp.hasMany(Transfer, { foreignKey: 'toCampId', as: 'transfersTo' });
}
