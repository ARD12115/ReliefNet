import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { haversineDistance, degreesToRadians, radiansToDegrees, boundingBox, validateCoordinates } from '../../src/utils/geospatial.js';

describe('Geospatial Utilities', () => {
  describe('haversineDistance', () => {
    it('should calculate distance between two points', () => {
      // Bangalore to Chennai ~ 350 km
      const distance = haversineDistance(12.9716, 77.5946, 13.0827, 80.2707);
      expect(distance).toBeGreaterThan(300);
      expect(distance).toBeLessThan(400);
    });

    it('should return 0 for same point', () => {
      const distance = haversineDistance(12.9716, 77.5946, 12.9716, 77.5946);
      expect(distance).toBe(0);
    });

    it('should be symmetric', () => {
      const d1 = haversineDistance(12.9716, 77.5946, 13.0827, 80.2707);
      const d2 = haversineDistance(13.0827, 80.2707, 12.9716, 77.5946);
      expect(d1).toBe(d2);
    });
  });

  describe('degreesToRadians', () => {
    it('should convert degrees to radians', () => {
      expect(degreesToRadians(180)).toBeCloseTo(Math.PI);
      expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2);
      expect(degreesToRadians(0)).toBe(0);
    });
  });

  describe('radiansToDegrees', () => {
    it('should convert radians to degrees', () => {
      expect(radiansToDegrees(Math.PI)).toBeCloseTo(180);
      expect(radiansToDegrees(Math.PI / 2)).toBeCloseTo(90);
      expect(radiansToDegrees(0)).toBe(0);
    });
  });

  describe('boundingBox', () => {
    it('should create bounding box around a point', () => {
      const box = boundingBox(12.9716, 77.5946, 10); // 10km radius
      expect(box.minLat).toBeLessThan(12.9716);
      expect(box.maxLat).toBeGreaterThan(12.9716);
      expect(box.minLng).toBeLessThan(77.5946);
      expect(box.maxLng).toBeGreaterThan(77.5946);
    });

    it('should increase box size with radius', () => {
      const box1 = boundingBox(12.9716, 77.5946, 10);
      const box2 = boundingBox(12.9716, 77.5946, 50);
      
      expect(box2.maxLat - box2.minLat).toBeGreaterThan(box1.maxLat - box1.minLat);
      expect(box2.maxLng - box2.minLng).toBeGreaterThan(box1.maxLng - box1.minLng);
    });
  });

  describe('validateCoordinates', () => {
    it('should validate correct coordinates', () => {
      expect(validateCoordinates(12.9716, 77.5946)).toBe(true);
      expect(validateCoordinates(-90, -180)).toBe(true);
      expect(validateCoordinates(90, 180)).toBe(true);
      expect(validateCoordinates(0, 0)).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      expect(validateCoordinates(91, 77.5946)).toBe(false);
      expect(validateCoordinates(12.9716, 181)).toBe(false);
      expect(validateCoordinates(-91, 0)).toBe(false);
      expect(validateCoordinates(0, -181)).toBe(false);
    });
  });
});