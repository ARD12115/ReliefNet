import request from 'supertest';
import { createApp } from '../src/app.js';
import { sequelize } from '../src/config/db.js';
import { User, Camp, InventoryItem, Request, Transfer } from '../src/models/index.js';

let app;
let authToken;
let campId;
let inventoryItemId;
let requestId;
let transferId;

beforeAll(async () => {
  app = await createApp();
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Auth API', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Coordinator',
        email: 'coordinator@test.org',
        password: 'SecurePass123!',
        role: 'coordinator',
        campId: campId
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('should login and return access token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'coordinator@test.org',
        password: 'SecurePass123!'
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    authToken = res.body.data.accessToken;
  });

  it('should get current user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Camp API', () => {
  it('should create a camp', async () => {
    const res = await request(app)
      .post('/api/camps')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Relief Camp',
        location: { lat: 12.9716, lng: 77.5946 },
        capacity: 500,
        contactPerson: 'Test Person',
        contactPhone: '+1234567890'
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    campId = res.body.data.camp.id;
  });

  it('should list camps', async () => {
    const res = await request(app)
      .get('/api/camps')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.camps)).toBe(true);
  });

  it('should get camp stats', async () => {
    const res = await request(app)
      .get(`/api/camps/${campId}/stats`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Inventory API', () => {
  it('should create an inventory item', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        campId,
        category: 'food',
        itemName: 'Rice bags',
        quantity: 100,
        unit: 'bags',
        minimumThreshold: 20
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    inventoryItemId = res.body.data.item.id;
  });

  it('should list inventory items', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it('should get inventory summary', async () => {
    const res = await request(app)
      .get('/api/inventory/summary')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Request API', () => {
  it('should create a request', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        campId,
        category: 'food',
        itemName: 'Rice bags',
        quantityNeeded: 50,
        urgency: 'high'
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    requestId = res.body.data.request.id;
  });

  it('should list requests', async () => {
    const res = await request(app)
      .get('/api/requests')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.requests)).toBe(true);
  });
});

describe('Transfer API', () => {
  it('should create a manual transfer', async () => {
    // Create a second camp as destination
    const destRes = await request(app)
      .post('/api/camps')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Destination Camp',
        location: { lat: 13.0827, lng: 80.2707 },
        capacity: 300
      });
    const destCampId = destRes.body.data.camp.id;

    const res = await request(app)
      .post('/api/transfers/manual')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fromCampId: campId,
        toCampId: destCampId,
        itemName: 'Rice bags',
        category: 'food',
        quantity: 30,
        unit: 'bags',
        priority: 'high'
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    transferId = res.body.data.transfer.id;
  });

  it('should list transfers', async () => {
    const res = await request(app)
      .get('/api/transfers')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.transfers)).toBe(true);
  });

  it('should get transfer stats', async () => {
    const res = await request(app)
      .get('/api/transfers/stats')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
