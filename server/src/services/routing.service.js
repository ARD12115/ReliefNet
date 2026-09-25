import axios from 'axios';

class RoutingService {
  constructor() {
    this.osrmUrl = process.env.OSRM_URL || 'http://localhost:5000';
    this.cache = new Map();
    this.cacheTTL = 30 * 60 * 1000; // 30 minutes
  }

  getCacheKey(lat1, lng1, lat2, lng2) {
    return `${lat1.toFixed(6)},${lng1.toFixed(6)};${lat2.toFixed(6)},${lng2.toFixed(6)}`;
  }

  async getRoute(lat1, lng1, lat2, lng2) {
    const cacheKey = this.getCacheKey(lat1, lng1, lat2, lng2);
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const url = `${this.osrmUrl}/route/v1/driving/${lng1},${lat1};${lng2},${lat2}`;
      const response = await axios.get(url, {
        params: {
          overview: 'full',
          geometries: 'geojson',
          steps: false
        },
        timeout: 10000
      });

      if (response.data.code !== 'Ok' || !response.data.routes?.length) {
        throw new Error('No route found');
      }

      const route = response.data.routes[0];
      const result = {
        distanceKm: route.distance / 1000,
        durationMinutes: Math.round(route.duration / 60),
        geometry: route.geometry,
        legs: route.legs
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error('OSRM routing error:', error.message);
      // Fallback to Haversine distance
      return this.getHaversineFallback(lat1, lng1, lat2, lng2);
    }
  }

  getHaversineFallback(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;
    
    // Rough estimate: 30 km/h average speed for relief vehicles
    const durationMinutes = Math.round((distanceKm / 30) * 60);

    return {
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationMinutes,
      geometry: null,
      legs: [],
      fallback: true
    };
  }

  async getDistanceMatrix(locations) {
    // locations: [{ lat, lng }, ...]
    // Returns matrix of distances/durations
    const n = locations.length;
    const matrix = {
      distances: Array(n).fill(null).map(() => Array(n).fill(0)),
      durations: Array(n).fill(null).map(() => Array(n).fill(0))
    };

    // For small matrices, compute pairwise
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const route = await this.getRoute(
          locations[i].lat, locations[i].lng,
          locations[j].lat, locations[j].lng
        );
        matrix.distances[i][j] = matrix.distances[j][i] = route.distanceKm;
        matrix.durations[i][j] = matrix.durations[j][i] = route.durationMinutes;
      }
    }

    return matrix;
  }

  clearCache() {
    this.cache.clear();
  }
}

let routingServiceInstance = null;

export const getRoutingService = () => {
  if (!routingServiceInstance) {
    routingServiceInstance = new RoutingService();
  }
  return routingServiceInstance;
};