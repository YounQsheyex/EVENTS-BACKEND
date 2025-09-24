// REDIS FOR CACHING
// Instead of hitting MongoDB for every request (which is slower and costly),
// we store frequently accessed data in Redis and fetch it from the cache first.

const { default: Redis } = require("ioredis"); // Import Redis client (ioredis library)

// Create a Redis client instance with connection details from environment variables
const redisConfig = new Redis({
  username: process.env.REDIS_USERNAME, // Redis username (if required by provider)
  host: process.env.REDIS_HOST, // Redis server host address
  port: Number(process.env.REDIS_PORT), // Redis server port (convert from string to number)
  password: process.env.REDIS_PASSWORD, // Redis password for authentication
});

// Event listener: fires when connection to Redis is established
redisConfig.on("connect", () => {
  console.log("Redis connected");
});

// Event listener: fires when Redis is fully ready to accept commands
redisConfig.on("ready", () => console.log("Redis ready"));

// Event listener: fires when Redis connection is closed
redisConfig.on("close", () => console.log("Redis closed"));

// Event listener: fires on connection or command errors
redisConfig.on("error", (err) => {
  console.error("Redis error:", err);
});

// Export the Redis client instance so other parts of the app can use it
module.exports = redisConfig;
