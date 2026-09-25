import { jest } from '@jest/globals';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
process.env.MONGODB_URI = 'mongodb://localhost:27017/reliefnet_test';
process.env.OSRM_URL = 'http://localhost:5000';

// Increase timeout for async tests
jest.setTimeout(10000);

// Global test utilities
global.testUtils = {
  createMockUser: (overrides = {}) => ({
    _id: '507f1f77bcf86cd799439011',
    name: 'Test User',
    email: 'test@reliefnet.org',
    role: 'coordinator',
    campId: '507f1f77bcf86cd799439012',
    isActive: true,
    ...overrides
  }),
  
  createMockCamp: (overrides = {}) => ({
    _id: '507f1f77bcf86cd799439012',
    name: 'Test Camp',
    location: {
      type: 'Point',
      coordinates: [77.5946, 12.9716] // Bangalore
    },
    capacity: 500,
    currentPopulation: 300,
    status: 'active',
    ...overrides
  }),
  
  createMockInventoryItem: (overrides = {}) => ({
    _id: '507f1f77bcf86cd799439013',
    campId: '507f1f77bcf86cd799439012',
    category: 'food',
    itemName: 'Rice bags',
    quantity: 100,
    unit: 'bags',
    minimumThreshold: 20,
    ...overrides
  }),
  
  createMockRequest: (overrides = {}) => ({
    _id: '507f1f77bcf86cd799439014',
    campId: '507f1f77bcf86cd799439012',
    category: 'food',
    itemName: 'Rice bags',
    quantityNeeded: 50,
    unit: 'bags',
    urgency: 'high',
    status: 'open',
    requestedBy: '507f1f77bcf86cd799439011',
    ...overrides
  }),
  
  createMockTransfer: (overrides = {}) => ({
    _id: '507f1f77bcf86cd799439015',
    fromCampId: '507f1f77bcf86cd799439012',
    toCampId: '507f1f77bcf86cd799439016',
    requestId: '507f1f77bcf86cd799439014',
    itemName: 'Rice bags',
    category: 'food',
    quantity: 50,
    unit: 'bags',
    routeDistanceKm: 15.5,
    routeDurationMinutes: 30,
    status: 'proposed',
    priority: 'high',
    ...overrides
  })
};

// Suppress console.log during tests unless debugging
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  if (!process.env.DEBUG_TESTS) {
    console.log = jest.fn();
    console.error = jest.fn();
  }
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});