# Redis Implementation Guide for Developers

## 🎯 How to Use Redis in Your Code

### 1. Import Redis Utilities

```javascript
// In any controller or route
const { 
  getCache, 
  setCache, 
  deleteCache, 
  deleteCachePattern,
  checkRateLimit,
  isRedisConnected,
  CacheKeys 
} = require('../utils/redis');
```

---

## 💾 Caching Examples

### Example 1: Cache Vehicle Data

**File**: `src/controllers/vehicleController.js`

```javascript
exports.getVehicles = async (req, res) => {
  try {
    // Build cache key from filters
    const filters = req.query || {};
    const cacheKey = `vehicles:list:${JSON.stringify(filters)}`;
    
    // Try to get from cache first
    let vehicles = await getCache(cacheKey);
    
    if (!vehicles) {
      // Cache miss - query database
      const where = {};
      if (filters.type) where.type = filters.type;
      if (filters.minPrice) where.price = { gte: parseInt(filters.minPrice) };
      
      vehicles = await req.prisma.vehicle.findMany({ where });
      
      // Store in cache for 5 minutes
      await setCache(cacheKey, vehicles, 300);
    }
    
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### Example 2: Cache Single Item

```javascript
exports.getVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `vehicles:${id}`;
    
    // Check cache
    let vehicle = await getCache(cacheKey);
    
    if (!vehicle) {
      // Get from database
      vehicle = await req.prisma.vehicle.findUnique({
        where: { id: parseInt(id) },
        include: { reviews: true, bookings: true }
      });
      
      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found' });
      }
      
      // Cache for 10 minutes
      await setCache(cacheKey, vehicle, 600);
    }
    
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### Example 3: Aggregate Data with Cache

```javascript
exports.getDashboardStats = async (req, res) => {
  try {
    const cacheKey = 'stats:dashboard';
    
    // Try cache first
    let stats = await getCache(cacheKey);
    
    if (!stats) {
      // Calculate stats
      const totalVehicles = await req.prisma.vehicle.count();
      const totalBookings = await req.prisma.booking.count();
      const totalRevenue = await req.prisma.booking.aggregate({
        _sum: { totalPrice: true }
      });
      
      stats = {
        vehicles: totalVehicles,
        bookings: totalBookings,
        revenue: totalRevenue._sum.totalPrice || 0,
        timestamp: new Date()
      };
      
      // Cache for 1 hour
      await setCache(cacheKey, stats, 3600);
    }
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

---

## 🔄 Cache Invalidation

### Invalidate on Create

```javascript
exports.createVehicle = async (req, res) => {
  try {
    // Create the vehicle
    const vehicle = await req.prisma.vehicle.create({
      data: req.body
    });
    
    // Invalidate all vehicle caches
    await deleteCachePattern('vehicles:*');
    
    // Also clear dashboard stats
    await deleteCache('stats:dashboard');
    
    res.status(201).json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### Invalidate on Update

```javascript
exports.updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Update the vehicle
    const vehicle = await req.prisma.vehicle.update({
      where: { id: parseInt(id) },
      data: req.body
    });
    
    // Clear specific and list caches
    await deleteCache(`vehicles:${id}`);
    await deleteCachePattern('vehicles:list:*');
    await deleteCache('stats:dashboard');
    
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### Invalidate on Delete

```javascript
exports.deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete the vehicle
    await req.prisma.vehicle.delete({
      where: { id: parseInt(id) }
    });
    
    // Clear caches
    await deleteCache(`vehicles:${id}`);
    await deleteCachePattern('vehicles:list:*');
    
    res.json({ message: 'Vehicle deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

---

## 🛡️ Rate Limiting Examples

### Example 1: Protect API Endpoint

**File**: `src/middleware/rateLimitMiddleware.js`

```javascript
const { checkRateLimit } = require('../utils/redis');

const apiRateLimit = async (req, res, next) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress;
    const limit = await checkRateLimit(
      clientIP,
      100,      // 100 requests
      900       // per 15 minutes
    );
    
    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': limit.remaining,
      'X-RateLimit-Reset': new Date(limit.resetTime).toISOString()
    });
    
    if (!limit.allowed) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((limit.resetTime - Date.now()) / 1000)
      });
    }
    
    next();
  } catch (error) {
    // If Redis fails, allow request (fail open)
    next();
  }
};

module.exports = { apiRateLimit };
```

### Example 2: Stricter Limits for Auth

```javascript
const authRateLimit = async (req, res, next) => {
  try {
    const clientIP = req.ip;
    const limit = await checkRateLimit(
      `auth:${clientIP}`,
      5,         // 5 requests
      900        // per 15 minutes
    );
    
    res.set('X-RateLimit-Remaining', limit.remaining);
    
    if (!limit.allowed) {
      return res.status(429).json({
        error: 'Too many login attempts. Please try again later.',
        retryAfter: Math.ceil((limit.resetTime - Date.now()) / 1000)
      });
    }
    
    next();
  } catch (error) {
    next();
  }
};

module.exports = { authRateLimit };
```

### Example 3: Per-User Rate Limiting

```javascript
const perUserRateLimit = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    if (!userId) return next();
    
    const limit = await checkRateLimit(
      `user:${userId}`,
      1000,      // 1000 requests
      3600       // per hour
    );
    
    if (!limit.allowed) {
      return res.status(429).json({
        error: 'User rate limit exceeded'
      });
    }
    
    next();
  } catch (error) {
    next();
  }
};

module.exports = { perUserRateLimit };
```

---

## 🔑 Using Cache Key Builders

### Consistent Key Patterns

```javascript
const { CacheKeys } = require('../utils/redis');

// Vehicles
const allVehiclesKey = CacheKeys.vehicles.all;
const vehicleKey = CacheKeys.vehicles.byId(123);
const suvKey = CacheKeys.vehicles.byType('SUV');
const availableKey = CacheKeys.vehicles.available;

// Deals
const allDealsKey = CacheKeys.deals.all;
const activeDealsKey = CacheKeys.deals.active;
const dealKey = CacheKeys.deals.byId(456);
const dealByCodeKey = CacheKeys.deals.byCode('SUMMER20');

// Stats
const dashboardKey = CacheKeys.stats.dashboard;
const revenueKey = CacheKeys.stats.revenue;
const bookingsKey = CacheKeys.stats.bookings;

// Users
const userKey = CacheKeys.user.byId('user123');
const userBookingsKey = CacheKeys.user.bookings('user123');
```

---

## ✅ Best Practices

### 1. Always Check Redis Connection

```javascript
const { isRedisConnected, getCache, setCache } = require('../utils/redis');

if (!isRedisConnected()) {
  console.warn('Redis not connected, using database queries');
  // Fall back to direct database query
  vehicle = await req.prisma.vehicle.findUnique({ ... });
} else {
  // Use caching
  vehicle = await getCache(cacheKey) || /* DB query */;
}
```

### 2. Set Appropriate TTLs

```javascript
// Short TTL for frequently changing data
await setCache('stats:realtime', data, 60);      // 1 minute

// Medium TTL for stable data
await setCache('vehicles:list', data, 300);      // 5 minutes

// Longer TTL for static data
await setCache('config:app', data, 3600);        // 1 hour

// Very short for sensitive data
await setCache('sessions:temp', data, 5);        // 5 seconds
```

### 3. Invalidate Strategically

```javascript
// ❌ Wrong: Too specific, might miss related caches
await deleteCache(`vehicles:${id}`);

// ✅ Right: Use patterns to clear all related
await deleteCache(`vehicles:${id}`);           // Specific
await deleteCachePattern(`vehicles:list:*`);   // All lists
await deleteCache('stats:dashboard');          // Related stats
```

### 4. Handle Cache Misses Gracefully

```javascript
try {
  let data = await getCache(key);
  
  if (!data) {
    // Cache miss - query DB
    data = await req.prisma.model.findMany(query);
    
    // Try to set cache, but don't fail if Redis is down
    await setCache(key, data, ttl);
  }
  
  return data;
} catch (error) {
  // Fallback to direct query if anything fails
  console.error('Cache error:', error);
  return await req.prisma.model.findMany(query);
}
```

### 5. Monitor Cache Performance

```javascript
// Add timing logs
const start = Date.now();
let data = await getCache(key);
const cacheTime = Date.now() - start;

if (data) {
  console.log(`Cache hit: ${cacheTime}ms`);
} else {
  const dbStart = Date.now();
  data = await req.prisma.model.findMany(query);
  const dbTime = Date.now() - dbStart;
  console.log(`Cache miss, DB query: ${dbTime}ms`);
  await setCache(key, data, ttl);
}
```

---

## 🧪 Testing

### Unit Test Example

```javascript
const { setCache, getCache, deleteCache } = require('../utils/redis');

describe('Vehicle Caching', () => {
  it('should cache vehicle data', async () => {
    const vehicle = { id: 1, name: 'Tesla' };
    const key = 'vehicles:1';
    
    // Set cache
    await setCache(key, vehicle, 300);
    
    // Retrieve from cache
    const cached = await getCache(key);
    expect(cached).toEqual(vehicle);
    
    // Clean up
    await deleteCache(key);
  });
  
  it('should return null for expired cache', async () => {
    const key = 'test:expired';
    await setCache(key, 'data', 1); // 1 second TTL
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    const cached = await getCache(key);
    expect(cached).toBeNull();
  });
});
```

---

## 📊 Monitoring & Debugging

### Check What's Cached

```javascript
const redis = require('redis');

async function debugCache() {
  const client = redis.createClient({
    // ... connection options
  });
  
  await client.connect();
  
  // See all cache keys
  const keys = await client.keys('vehicles:*');
  console.log('Vehicle caches:', keys);
  
  // Check specific key
  const data = await client.get('vehicles:123');
  console.log('Vehicle 123:', JSON.parse(data));
  
  // Check TTL
  const ttl = await client.ttl('vehicles:123');
  console.log('TTL remaining:', ttl, 'seconds');
}
```

### Monitor Cache Hits/Misses

```javascript
let cacheHits = 0;
let cacheMisses = 0;

// In your controller
const data = await getCache(key);
if (data) {
  cacheHits++;
} else {
  cacheMisses++;
}

// Get stats
const hitRate = (cacheHits / (cacheHits + cacheMisses) * 100).toFixed(2);
console.log(`Cache hit rate: ${hitRate}%`);
```

---

## 🚀 Production Checklist

- [ ] All cache keys follow naming convention
- [ ] TTLs are set appropriately
- [ ] Cache invalidation on all updates
- [ ] Rate limiting applied to sensitive endpoints
- [ ] Redis connection monitoring enabled
- [ ] Error handling for Redis failures
- [ ] Performance metrics collected
- [ ] Documentation updated
- [ ] Tests passing
- [ ] Deployed and verified

---

## 🔗 Related Files

- `src/utils/redis.js` - Core Redis utilities
- `docs/REDIS_QUICK_REFERENCE.md` - Quick reference
- `docs/REDIS_SETUP_GUIDE.md` - Setup & troubleshooting
- `scripts/verify-redis.js` - Verification script
- `app.js` - Session configuration

---

**Happy caching!** 🎉
