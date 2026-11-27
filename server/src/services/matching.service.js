import InventoryItem from '../models/InventoryItem.js';
import Request from '../models/Request.js';
import Transfer from '../models/Transfer.js';
import Camp from '../models/Camp.js';
import { getRoutingService } from './routing.service.js';
import { getSocketService } from './socket.service.js';
import { Op } from 'sequelize';
import '../models/associations.js';


class MatchingService {
  constructor() {
    this.isRunning = false;
    this.URGENCY_WEIGHTS = {
      low: 1,
      medium: 2,
      high: 4,
      critical: 8
    };
    this.MAX_MATCH_DISTANCE_KM = 100;
    this.MIN_SURPLUS_THRESHOLD = 1;
  }

  async runMatching() {
    if (this.isRunning) {
      console.log('Matching already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('Starting supply-demand matching...');

    try {
      // Find all open/partial requests
      const openRequests = await Request.findAll({
        where: {
          status: { [Op.in]: ['open', 'partial', 'matched'] }
        },
        include: [{ model: Camp, as: 'camp', attributes: ['id', 'name', 'latitude', 'longitude', 'status'] }]
      });

      console.log(`Found ${openRequests.length} open requests to match`);

      for (const request of openRequests) {
        await this.matchRequest(request);
      }

      console.log('Matching completed');
    } catch (error) {
      console.error('Matching error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async matchRequest(request) {
    try {
      // Skip if camp is evacuating
      if (request.camp && (request.camp.status === 'evacuating' || request.camp.status === 'evacuated')) {
        return;
      }

      const quantityRemaining = request.getQuantityRemaining();
      if (quantityRemaining <= 0) return;

      // Find camps with surplus of the same item
      const surplusCamps = await this.findSurplusCamps(
        request.category,
        request.itemName,
        quantityRemaining,
        request.campId
      );

      if (surplusCamps.length === 0) {
        console.log(`No surplus found for ${request.itemName} (${request.category})`);
        return;
      }

      // Score and sort matches
      const scoredMatches = await this.scoreMatches(request, surplusCamps);

      // Try to fulfill the request (potentially split across multiple camps)
      await this.createTransfersForRequest(request, scoredMatches);

    } catch (error) {
      console.error(`Error matching request ${request.id}:`, error);
    }
  }

  async findSurplusCamps(category, itemName, quantityNeeded, excludeCampId) {
    // Find inventory items with surplus
    const where = { category, itemName };
    if (excludeCampId) {
      where.campId = { [Op.ne]: excludeCampId };
    }

    const inventoryItems = await InventoryItem.findAll({
      where,
      include: [{ model: Camp, as: 'camp', attributes: ['id', 'name', 'latitude', 'longitude', 'status'] }]
    });

    // Filter for camps with actual surplus and active status
    const surplusCamps = [];
    for (const item of inventoryItems) {
      if (item.camp && item.camp.status !== 'active') continue;
      const surplus = item.getSurplusQuantity();
      if (surplus >= this.MIN_SURPLUS_THRESHOLD) {
        surplusCamps.push({
          inventoryItem: item,
          camp: item.camp,
          availableQuantity: surplus
        });
      }
    }

    return surplusCamps;
  }

  async scoreMatches(request, surplusCamps) {
    const routingService = getRoutingService();
    const requestCamp = request.camp;
    const scored = [];

    for (const surplus of surplusCamps) {
      try {
        // Calculate distance using routing service
        const route = await routingService.getRoute(
          requestCamp.latitude, requestCamp.longitude,
          surplus.camp.latitude, surplus.camp.longitude
        );

        const distanceKm = route.distanceKm;

        // Skip if too far
        if (distanceKm > this.MAX_MATCH_DISTANCE_KM) continue;

        // Calculate score: urgency_weight * quantity_factor / distance_factor
        const urgencyWeight = this.URGENCY_WEIGHTS[request.urgency] || 1;
        const quantityFactor = Math.min(surplus.availableQuantity, request.quantityRemaining) / request.quantityRemaining;
        const distanceFactor = Math.max(1, distanceKm / 10); // Normalize distance

        const score = (urgencyWeight * quantityFactor) / distanceFactor;

        scored.push({
          ...surplus,
          distanceKm,
          durationMinutes: route.durationMinutes,
          routeGeometry: route.geometry,
          score,
          quantityToTransfer: Math.min(surplus.availableQuantity, request.quantityRemaining)
        });
      } catch (error) {
        console.error(`Routing error for match:`, error);
        // Fallback to Haversine distance
        const distanceKm = this.haversineDistance(
          requestCamp.latitude, requestCamp.longitude,
          surplus.camp.latitude, surplus.camp.longitude
        );

        if (distanceKm > this.MAX_MATCH_DISTANCE_KM) continue;

        const urgencyWeight = this.URGENCY_WEIGHTS[request.urgency] || 1;
        const quantityFactor = Math.min(surplus.availableQuantity, request.quantityRemaining) / request.quantityRemaining;
        const distanceFactor = Math.max(1, distanceKm / 10);

        const score = (urgencyWeight * quantityFactor) / distanceFactor;

        scored.push({
          ...surplus,
          distanceKm,
          durationMinutes: Math.round(distanceKm * 2), // Rough estimate: 30 km/h
          routeGeometry: null,
          score,
          quantityToTransfer: Math.min(surplus.availableQuantity, request.quantityRemaining)
        });
      }
    }

    // Sort by score descending (highest first)
    return scored.sort((a, b) => b.score - a.score);
  }

  async createTransfersForRequest(request, scoredMatches) {
    let remainingQuantity = request.getQuantityRemaining();
    const createdTransfers = [];

    for (const match of scoredMatches) {
      if (remainingQuantity <= 0) break;

      const quantityToTransfer = Math.min(match.quantityToTransfer, remainingQuantity);

      // Check if transfer already exists for this request from this camp
      const existingTransfer = await Transfer.findOne({
        where: {
          requestId: request.id,
          fromCampId: match.camp.id,
          status: { [Op.in]: ['proposed', 'assigned', 'in_transit'] }
        }
      });

      if (existingTransfer) {
        console.log(`Transfer already exists for request ${request.id} from camp ${match.camp.id}`);
        continue;
      }

      // Double-check inventory availability (race condition protection)
      const currentInventory = await InventoryItem.findByPk(match.inventoryItem.id);
      if (!currentInventory || currentInventory.getSurplusQuantity() < quantityToTransfer) {
        console.log(`Insufficient surplus now for camp ${match.camp.id}`);
        continue;
      }

      // Reserve the quantity so concurrent matching runs cannot overallocate
      await InventoryItem.increment({ reservedQuantity: quantityToTransfer }, {
        where: { id: currentInventory.id }
      });

      // Re-check after reservation
      const refreshedInv = await InventoryItem.findByPk(currentInventory.id);
      if (refreshedInv.getSurplusQuantity() < quantityToTransfer) {
        await InventoryItem.decrement({ reservedQuantity: quantityToTransfer }, { where: { id: currentInventory.id } });
        console.log(`Insufficient surplus now for camp ${match.camp.id}`);
        continue;
      }

      // Create transfer
      const transfer = await Transfer.create({
        fromCampId: match.camp.id,
        toCampId: request.campId,
        requestId: request.id,
        itemName: request.itemName,
        category: request.category,
        quantity: quantityToTransfer,
        unit: request.unit,
        routeDistanceKm: match.distanceKm,
        routeDurationMinutes: match.durationMinutes,
        routeGeometry: match.routeGeometry,
        priority: request.urgency,
        createdBy: request.requestedBy
      });

      createdTransfers.push(transfer);
      remainingQuantity -= quantityToTransfer;

      // Update request status to matched if it was open
      if (request.status === 'open') {
        request.status = 'matched';
        await request.save();
      }

      // Emit real-time event
      const socketService = getSocketService();
      const populatedTransfer = await Transfer.findByPk(transfer.id, {
        include: [
          { model: Camp, as: 'fromCamp', attributes: ['id', 'name', 'latitude', 'longitude'] },
          { model: Camp, as: 'toCamp', attributes: ['id', 'name', 'latitude', 'longitude'] },
          { model: Request, as: 'request', attributes: ['id', 'itemName', 'category', 'urgency'] }
        ]
      });

      socketService.emitToCamp(request.campId, 'transfer:created', populatedTransfer);
      socketService.emitToCamp(match.camp.id, 'transfer:created', populatedTransfer);
      socketService.emitToAdmins('transfer:created', populatedTransfer);
      socketService.emitToDispatchers('transfer:created', populatedTransfer);
      socketService.emitToCamp(request.campId, 'match:found', {
        requestId: request.id,
        fromCamp: match.camp,
        quantity: quantityToTransfer,
        distanceKm: match.distanceKm,
        estimatedDuration: match.durationMinutes
      });
    }

    if (createdTransfers.length > 0) {
      console.log(`Created ${createdTransfers.length} transfers for request ${request.id}`);
    }
  }

  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Trigger matching for specific camp/category/item
  async triggerMatching(campId, category, itemName) {
    const requests = await Request.findAll({
      where: {
        campId,
        category,
        itemName,
        status: { [Op.in]: ['open', 'partial', 'matched'] }
      },
      include: [{ model: Camp, as: 'camp', attributes: ['id', 'name', 'latitude', 'longitude', 'status'] }]
    });

    for (const request of requests) {
      await this.matchRequest(request);
    }
  }
}

let matchingServiceInstance = null;

export const getMatchingService = () => {
  if (!matchingServiceInstance) {
    matchingServiceInstance = new MatchingService();
  }
  return matchingServiceInstance;
};

export const startMatchingCron = () => {
  const service = getMatchingService();

  // Run every 5 minutes
  setInterval(() => {
    service.runMatching();
  }, 5 * 60 * 1000);

  // Initial run after 10 seconds
  setTimeout(() => {
    service.runMatching();
  }, 10000);

  console.log('Matching cron started (every 5 minutes)');
};
