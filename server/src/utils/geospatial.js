/**
 * Geospatial utility functions for distance calculations and coordinate handling
 */

export const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const degreesToRadians = (degrees) => {
  return degrees * Math.PI / 180;
};

export const radiansToDegrees = (radians) => {
  return radians * 180 / Math.PI;
};

export const boundingBox = (lat, lng, radiusKm) => {
  const latDelta = radiusKm / 111.32; // 1 degree lat ≈ 111.32 km
  const lngDelta = radiusKm / (111.32 * Math.cos(degreesToRadians(lat)));
  
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta
  };
};

export const isPointInBoundingBox = (lat, lng, box) => {
  return lat >= box.minLat && lat <= box.maxLat && 
         lng >= box.minLng && lng <= box.maxLng;
};

export const midpoint = (lat1, lng1, lat2, lng2) => {
  const dLon = degreesToRadians(lng2 - lng1);
  const lat1Rad = degreesToRadians(lat1);
  const lat2Rad = degreesToRadians(lat2);
  
  const Bx = Math.cos(lat2Rad) * Math.cos(dLon);
  const By = Math.cos(lat2Rad) * Math.sin(dLon);
  
  const midLat = Math.atan2(
    Math.sin(lat1Rad) + Math.sin(lat2Rad),
    Math.sqrt((Math.cos(lat1Rad) + Bx) ** 2 + By ** 2)
  );
  
  const midLng = degreesToRadians(lng1) + Math.atan2(
    By,
    Math.cos(lat1Rad) + Bx
  );
  
  return {
    lat: radiansToDegrees(midLat),
    lng: radiansToDegrees(midLng)
  };
};

export const formatCoordinates = (lat, lng, precision = 6) => {
  return {
    lat: parseFloat(lat.toFixed(precision)),
    lng: parseFloat(lng.toFixed(precision))
  };
};

export const validateCoordinates = (lat, lng) => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

export const calculateBearing = (lat1, lng1, lat2, lng2) => {
  const dLon = degreesToRadians(lng2 - lng1);
  const lat1Rad = degreesToRadians(lat1);
  const lat2Rad = degreesToRadians(lat2);
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  const bearing = Math.atan2(y, x);
  return (radiansToDegrees(bearing) + 360) % 360;
};

export const destinationPoint = (lat, lng, bearing, distanceKm) => {
  const R = 6371;
  const angularDistance = distanceKm / R;
  const bearingRad = degreesToRadians(bearing);
  const lat1Rad = degreesToRadians(lat);
  const lng1Rad = degreesToRadians(lng);
  
  const lat2Rad = Math.asin(
    Math.sin(lat1Rad) * Math.cos(angularDistance) +
    Math.cos(lat1Rad) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );
  
  const lng2Rad = lng1Rad + Math.atan2(
    Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1Rad),
    Math.cos(angularDistance) - Math.sin(lat1Rad) * Math.sin(lat2Rad)
  );
  
  return {
    lat: radiansToDegrees(lat2Rad),
    lng: radiansToDegrees(lng2Rad)
  };
};