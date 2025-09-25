// Import the default Arcjet function (for creating an Arcjet instance)
const arcjet = require("@arcjet/node").default;

// Import specific built-in rules: shield, detectBot, and tokenBucket
const { shield, detectBot, tokenBucket } = require("@arcjet/node");

// Create an Arcjet instance with configuration
const aj = arcjet({
  // API key (from Arcjet dashboard) stored in environment variable
  key: process.env.ARCJET_KEY,

  // "characteristics" tells Arcjet what to use for identifying clients.
  // Here: by source IP address
  characteristics: ["ip.src"],

  // Define the security/rate-limiting rules to enforce
  rules: [
    // 1. Shield protects against common attack patterns (e.g., SQL injection, XSS).
    // Mode "LIVE" actively blocks bad requests instead of just logging them.
    shield({ mode: "LIVE" }),

    // 2. Bot detection rule
    detectBot({
      mode: "LIVE", // Actively block instead of just logging
      // "deny" specifies which categories of bots are blocked
      deny: [
        "CATEGORY:ADVERTISING", // Ad bots
        "CATEGORY:AI", // AI scrapers
        "CATEGORY:ARCHIVE", // Archive.org, crawlers
        "CATEGORY:OPTIMIZER", // SEO optimizers
        "CATEGORY:YAHOO", // Yahoo bots
      ],
    }),

    // 3. Token bucket rate limiting
    tokenBucket({
      mode: "LIVE", // Actively enforce rate limit
      refillRate: 5, // Add 5 tokens every "interval"
      interval: 10, // Interval is 10 seconds
      capacity: 10, // Max bucket size = 10 tokens
    }),
    // Explanation: Each request consumes 1 token.
    // Clients can burst up to 10 requests at once.
    // Every 10 seconds, 5 tokens are added back.
  ],
});

// Export the Arcjet instance so it can be used in routes or middleware
module.exports = aj;
