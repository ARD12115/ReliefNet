import { jest } from '@jest/globals';
import dotenv from 'dotenv';

// Load .env so Aiven DATABASE_URL is available
dotenv.config();

// Force SSL env vars before importing db.js (Aiven uses self-signed cert)
process.env.DB_SSL_REQUIRED = 'true';
process.env.DB_SSL_REJECT_UNAUTHORIZED = 'false';

import { sequelize } from '../src/config/db.js';
import User from '../src/models/User.js';
import Camp from '../src/models/Camp.js';
import InventoryItem from '../src/models/InventoryItem.js';
import Request from '../src/models/Request.js';
import Transfer from '../src/models/Transfer.js';

jest.setTimeout(30000);

describe('Database Integration — Aiven PostgreSQL Connectivity', () => {
  beforeAll(async () => {
    try {
      await sequelize.authenticate();
      console.log('✓ PostgreSQL connection authenticated');
    } catch (error) {
      console.error('✗ PostgreSQL connection failed:', error.message);
      throw error;
    }
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('should connect to Aiven PostgreSQL and query all models', async () => {
    // Test each model can be queried (returns 0 or more rows, no crash)
    const userCount = await User.count();
    const campCount = await Camp.count();
    const inventoryCount = await InventoryItem.count();
    const requestCount = await Request.count();
    const transferCount = await Transfer.count();

    console.log(`✓ Models queryable — Users: ${userCount}, Camps: ${campCount}, Inventory: ${inventoryCount}, Requests: ${requestCount}, Transfers: ${transferCount}`);

    expect(typeof userCount).toBe('number');
    expect(typeof campCount).toBe('number');
    expect(typeof inventoryCount).toBe('number');
    expect(typeof requestCount).toBe('number');
    expect(typeof transferCount).toBe('number');
  });

  test('should create and read a Camp record', async () => {
    const camp = await Camp.create({
      name: 'Integration Test Camp',
      latitude: 12.9716,
      longitude: 77.5946,
      capacity: 100,
      currentPopulation: 0,
      status: 'active',
    });

    expect(camp.id).toBeDefined();
    expect(camp.name).toBe('Integration Test Camp');

    const found = await Camp.findByPk(camp.id);
    expect(found).not.toBeNull();
    expect(found.name).toBe('Integration Test Camp');

    // Cleanup
    await camp.destroy();
  });

  test('should create and read an InventoryItem record', async () => {
    const camp = await Camp.create({
      name: 'Inventory Test Camp',
      latitude: 12.9716,
      longitude: 77.5946,
      capacity: 100,
      currentPopulation: 0,
      status: 'active',
    });

    const item = await InventoryItem.create({
      campId: camp.id,
      category: 'food',
      itemName: 'Test Rice',
      quantity: 100,
      reservedQuantity: 0,
      unit: 'bags',
      minimumThreshold: 10,
    });

    expect(item.id).toBeDefined();
    expect(item.getSurplusQuantity()).toBe(90); // 100 - 10 - 0

    // Test reservedQuantity logic
    await item.increment({ reservedQuantity: 20 });
    const refreshed = await InventoryItem.findByPk(item.id);
    expect(refreshed.getSurplusQuantity()).toBe(70); // 100 - 10 - 20

    // Cleanup
    await item.destroy();
    await camp.destroy();
  });

  test('should create and read a Request record', async () => {
    const camp = await Camp.create({
      name: 'Request Test Camp',
      latitude: 12.9716,
      longitude: 77.5946,
      capacity: 100,
      currentPopulation: 0,
      status: 'active',
    });

    const user = await User.create({
      email: 'test@reliefnet.org',
      password: 'hashedpassword',
      name: 'Test User',
      role: 'coordinator',
      campId: camp.id,
    });

    const request = await Request.create({
      campId: camp.id,
      category: 'food',
      itemName: 'Test Rice',
      quantityNeeded: 50,
      quantityFulfilled: 0,
      unit: 'bags',
      urgency: 'high',
      status: 'open',
      requestedBy: user.id,
    });

    expect(request.id).toBeDefined();
    expect(request.getQuantityRemaining()).toBe(50);

    // Cleanup
    await request.destroy();
    await user.destroy();
    await camp.destroy();
  });

  test('should create and read a Transfer record with associations', async () => {
    const fromCamp = await Camp.create({
      name: 'Source Camp',
      latitude: 12.9716,
      longitude: 77.5946,
      capacity: 100,
      currentPopulation: 0,
      status: 'active',
    });

    const toCamp = await Camp.create({
      name: 'Dest Camp',
      latitude: 13.0827,
      longitude: 80.2707,
      capacity: 100,
      currentPopulation: 0,
      status: 'active',
    });

    const user = await User.create({
      email: 'dispatcher@reliefnet.org',
      password: 'hashedpassword',
      name: 'Dispatcher User',
      role: 'dispatcher',
    });

    const transfer = await Transfer.create({
      fromCampId: fromCamp.id,
      toCampId: toCamp.id,
      itemName: 'Test Rice',
      category: 'food',
      quantity: 25,
      unit: 'bags',
      status: 'proposed',
      priority: 'high',
      createdBy: user.id,
    });

    expect(transfer.id).toBeDefined();
    expect(transfer.getIsActive()).toBe(true);

    const found = await Transfer.findByPk(transfer.id, {
      include: [
        { model: Camp, as: 'fromCamp', attributes: ['id', 'name'] },
        { model: Camp, as: 'toCamp', attributes: ['id', 'name'] },
      ],
    });
    expect(found.fromCamp.name).toBe('Source Camp');
    expect(found.toCamp.name).toBe('Dest Camp');

    // Cleanup
    await transfer.destroy();
    await user.destroy();
    await fromCamp.destroy();
    await toCamp.destroy();
  });
});
