// Import the configured Redis client
const redisConfig = require("../helpers/redis.js");

// Higher-order function that returns middleware.
// keyPrefix lets you namespace cache keys per route (e.g., "events", "users")
const cache = (keyPrefix) => {
  return async (req, res, next) => {
    // Build a unique cache key using prefix + query/params
    // Example: "events{"page":2}" → avoids key collisions
    const key = keyPrefix + JSON.stringify(req.query || req.params);

    try {
      // Try fetching cached response from Redis
      const cacheData = await redisConfig.get(key);

      if (cacheData) {
        // If cached data exists, return it immediately
        console.log("Data from Redis:", key);
        return res.status(200).json(JSON.parse(cacheData));
      }

      // If no cached data, intercept res.json to store fresh response
      const originalJson = res.json.bind(res); // Keep a reference to original res.json

      res.json = (data) => {
        // Save the response in Redis with a TTL of 1 hour (3600 seconds)
        redisConfig.setex(key, 60 * 60, JSON.stringify(data));
        // Then send response to client
        return originalJson(data);
      };

      // Continue to the controller/next middleware
      next();
    } catch (err) {
      // Log error but don’t block request (fallback to normal flow)
      console.error("Cache middleware error:", err);
      next();
    }
  };
};

// Export the cache middleware factory
module.exports = cache;
