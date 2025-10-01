// Import the configured Redis client
const redisConfig = require("../helpers/redis.js");

const cache = (keyPrefix) => {
  return async (req, res, next) => {
    const key = keyPrefix + JSON.stringify(req.query || req.params);

    try {
      // Try fetching cached response from Redis
      const cachedBody = await redisConfig.get(key);
      const cachedStatus = await redisConfig.get(key + ":status");

      if (cachedBody && cachedStatus) {
        console.log("Serving from Redis:", key);
        return res.status(Number(cachedStatus)).json(JSON.parse(cachedBody));
      }

      // Intercept res.status
      const originalStatus = res.status.bind(res);
      let statusCode = 200; // default

      res.status = (code) => {
        statusCode = code;
        return originalStatus(code);
      };

      // Intercept res.json
      const originalJson = res.json.bind(res);

      res.json = (data) => {
        // Save both status and json into Redis
        redisConfig.setex(key, 60 * 60, JSON.stringify(data));
        redisConfig.setex(key + ":status", 60 * 60, statusCode.toString());

        return originalJson(data);
      };

      next();
    } catch (err) {
      console.error("Cache middleware error:", err);
      next();
    }
  };
};

module.exports = cache;
