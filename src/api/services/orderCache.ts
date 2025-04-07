
// Caching mechanism for orders data

// Cache for orders data
const ordersCache = {
  byId: new Map<string, { data: any; timestamp: number }>(),
  byUser: new Map<string, { data: any[]; timestamp: number }>(),
  byRestaurant: new Map<string, { data: any[]; timestamp: number }>(),
  byCourier: new Map<string, { data: any[]; timestamp: number }>(),
  byStatus: new Map<string, { data: any[]; timestamp: number }>(),
};

// Cache TTL in milliseconds (30 seconds for development, adjust as needed)
const CACHE_TTL = 30 * 1000;

export const orderCacheService = {
  // Get cached data if available and not expired
  getCached: (cacheType: keyof typeof ordersCache, key: string) => {
    const cachedData = ordersCache[cacheType].get(key);
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp < CACHE_TTL)) {
      console.log(`Using cached ${cacheType} data for key: ${key}`);
      return cachedData.data;
    }
    
    return null;
  },
  
  // Store data in cache
  setCache: (cacheType: keyof typeof ordersCache, key: string, data: any) => {
    ordersCache[cacheType].set(key, { 
      data, 
      timestamp: Date.now() 
    });
  },
  
  // Clear all caches or specific caches
  clearCache: (type?: keyof typeof ordersCache, key?: string) => {
    if (!type) {
      Object.values(ordersCache).forEach(cache => {
        if (cache instanceof Map) {
          cache.clear();
        }
      });
      console.log('All order caches cleared');
      return;
    }
    
    if (key && ordersCache[type].has(key)) {
      ordersCache[type].delete(key);
      console.log(`Cache cleared for ${type} with key ${key}`);
    } else if (!key) {
      if (ordersCache[type] instanceof Map) {
        (ordersCache[type] as Map<string, any>).clear();
      }
      console.log(`All ${type} caches cleared`);
    }
  }
};
