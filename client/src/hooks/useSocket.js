import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { socketService } from '../services/socket';

export const useSocket = () => {
  const { accessToken, isAuthenticated } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      socketService.connect();
      
      const checkConnection = setInterval(() => {
        setIsConnected(socketService.isConnected());
      }, 1000);

      return () => {
        clearInterval(checkConnection);
        socketService.disconnect();
      };
    } else {
      socketService.disconnect();
      setIsConnected(false);
    }
  }, [isAuthenticated, accessToken]);

  const on = (event, callback) => {
    return socketService.on(event, callback);
  };

  const off = (event, callback) => {
    socketService.off(event, callback);
  };

  const joinCamp = (campId) => {
    socketService.joinCamp(campId);
  };

  const leaveCamp = (campId) => {
    socketService.leaveCamp(campId);
  };

  return {
    isConnected,
    on,
    off,
    joinCamp,
    leaveCamp
  };
};

export const useInventorySocket = (campId, callbacks = {}) => {
  const { on, off, joinCamp, leaveCamp, isConnected } = useSocket();

  useEffect(() => {
    if (campId) {
      joinCamp(campId);
    }

    const unsubscribers = [];

    if (callbacks.onInventoryUpdated) {
      unsubscribers.push(on('inventory:updated', callbacks.onInventoryUpdated));
    }
    if (callbacks.onInventoryBulkUpdated) {
      unsubscribers.push(on('inventory:bulkUpdated', callbacks.onInventoryBulkUpdated));
    }
    if (callbacks.onInventoryDeleted) {
      unsubscribers.push(on('inventory:deleted', callbacks.onInventoryDeleted));
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
      if (campId) {
        leaveCamp(campId);
      }
    };
  }, [campId, callbacks.onInventoryUpdated, callbacks.onInventoryBulkUpdated, callbacks.onInventoryDeleted, on, off, joinCamp, leaveCamp]);

  return { isConnected };
};

export const useRequestSocket = (campId, callbacks = {}) => {
  const { on, off, joinCamp, leaveCamp, isConnected } = useSocket();

  useEffect(() => {
    if (campId) {
      joinCamp(campId);
    }

    const unsubscribers = [];

    if (callbacks.onRequestCreated) {
      unsubscribers.push(on('request:created', callbacks.onRequestCreated));
    }
    if (callbacks.onRequestUpdated) {
      unsubscribers.push(on('request:updated', callbacks.onRequestUpdated));
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
      if (campId) {
        leaveCamp(campId);
      }
    };
  }, [campId, callbacks.onRequestCreated, callbacks.onRequestUpdated, on, off, joinCamp, leaveCamp]);

  return { isConnected };
};

export const useTransferSocket = (campId, callbacks = {}) => {
  const { on, off, joinCamp, leaveCamp, isConnected } = useSocket();

  useEffect(() => {
    if (campId) {
      joinCamp(campId);
    }

    const unsubscribers = [];

    if (callbacks.onTransferCreated) {
      unsubscribers.push(on('transfer:created', callbacks.onTransferCreated));
    }
    if (callbacks.onTransferUpdated) {
      unsubscribers.push(on('transfer:updated', callbacks.onTransferUpdated));
    }
    if (callbacks.onTransferAssigned) {
      unsubscribers.push(on('transfer:assigned', callbacks.onTransferAssigned));
    }
    if (callbacks.onMatchFound) {
      unsubscribers.push(on('match:found', callbacks.onMatchFound));
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
      if (campId) {
        leaveCamp(campId);
      }
    };
  }, [campId, callbacks.onTransferCreated, callbacks.onTransferUpdated, callbacks.onTransferAssigned, callbacks.onMatchFound, on, off, joinCamp, leaveCamp]);

  return { isConnected };
};

export const useAdminSocket = (callbacks = {}) => {
  const { on, off, isConnected } = useSocket();

  useEffect(() => {
    const unsubscribers = [];

    if (callbacks.onInventoryUpdated) {
      unsubscribers.push(on('inventory:updated', callbacks.onInventoryUpdated));
    }
    if (callbacks.onRequestCreated) {
      unsubscribers.push(on('request:created', callbacks.onRequestCreated));
    }
    if (callbacks.onRequestUpdated) {
      unsubscribers.push(on('request:updated', callbacks.onRequestUpdated));
    }
    if (callbacks.onTransferCreated) {
      unsubscribers.push(on('transfer:created', callbacks.onTransferCreated));
    }
    if (callbacks.onTransferUpdated) {
      unsubscribers.push(on('transfer:updated', callbacks.onTransferUpdated));
    }
    if (callbacks.onCampCreated) {
      unsubscribers.push(on('camp:created', callbacks.onCampCreated));
    }
    if (callbacks.onCampUpdated) {
      unsubscribers.push(on('camp:updated', callbacks.onCampUpdated));
    }
    if (callbacks.onStatsUpdated) {
      unsubscribers.push(on('stats:updated', callbacks.onStatsUpdated));
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [callbacks, on, off]);

  return { isConnected };
};

export const useDispatcherSocket = (callbacks = {}) => {
  const { on, off, isConnected } = useSocket();

  useEffect(() => {
    const unsubscribers = [];

    if (callbacks.onRequestCreated) {
      unsubscribers.push(on('request:created', callbacks.onRequestCreated));
    }
    if (callbacks.onRequestUpdated) {
      unsubscribers.push(on('request:updated', callbacks.onRequestUpdated));
    }
    if (callbacks.onTransferCreated) {
      unsubscribers.push(on('transfer:created', callbacks.onTransferCreated));
    }
    if (callbacks.onTransferUpdated) {
      unsubscribers.push(on('transfer:updated', callbacks.onTransferUpdated));
    }
    if (callbacks.onTransferAssigned) {
      unsubscribers.push(on('transfer:assigned', callbacks.onTransferAssigned));
    }
    if (callbacks.onMatchFound) {
      unsubscribers.push(on('match:found', callbacks.onMatchFound));
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [callbacks, on, off]);

  return { isConnected };
};