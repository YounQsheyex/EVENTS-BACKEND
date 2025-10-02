const redisConfig = require("./redis");

// Fetch coordinates from Nominatim for a given location string
const geocodeLocation = async (location) => {
  const cacheKey = `geocode:${location.toLowerCase()}`;

  // 1. Check Redis cache first
  const cached = await redisConfig.get(cacheKey);
  if (cached) {
    console.log(`Cache hit for ${location}`);
    return JSON.parse(cached); // Already [lat, lon]
  }

  console.log(`Cache miss for ${location}, querying Nominatim...`);

  // 2. If not cached, fetch from Nominatim API
  // Send request to Nominatim API, encoding the location safely into the query string
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      location
    )}&format=json&limit=1`, // JSON output, only 1 result
    {
      headers: {
        // Nominatim requires a User-Agent identifying your app or email
        "User-Agent": "EventraApp/1.0 (eventsbyeventra@gmail.com)",
      },
    }
  );

  // Parse JSON response into an array of possible locations
  const data = await response.json();

  // If no results are found, throw an error to handle upstream
  if (!data.length) return false;

  // [latitude, longitude] as floating-point numbers
  const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];

  // 3. Store in Redis with TTL(time to live) (e.g., 7 days)
  await redisConfig.set(
    cacheKey,
    JSON.stringify(coords),
    "EX",
    60 * 60 * 24 * 7
  );

  return coords;
};

// Export function so it can be reused in other files
module.exports = geocodeLocation;
