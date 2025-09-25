// Import the configured Arcjet instance from config/arcjet.js
const aj = require("../config/arcjet");

// Define Arcjet middleware for Express (or any Node HTTP framework)
const arcjetMiddleware = async (req, res, next) => {
  try {
    // Ask Arcjet to "protect" this request
    // `requested: 1` means this request consumes 1 token (for rate limiting)
    const decision = await aj.protect(req, { requested: 1 });

    // If Arcjet decides the request should be denied
    if (decision.isDenied()) {
      // Check if denial is because of rate limiting
      if (decision.reason.isRateLimit()) {
        return res.status(429).json({ error: `Rate limit exceeded` });
      }

      // Check if denial is because request looks like a bot
      if (decision.reason.isBot()) {
        return res.status(403).json({ error: "Bot detected" });
      }

      // Fallback for any other denial reason (security rules, etc.)
      return res.status(403).json({ error: "Access Denied" });
    }

    // If Arcjet allows the request, pass control to the next middleware/route
    next();
  } catch (error) {
    // Log any unexpected error that occurs during protection
    console.log(`Arcjet Middleware Error: ${error}`);

    // Pass the error to Express error handler
    next(error);
  }
};

// Export the middleware function so it can be applied to routes
module.exports = arcjetMiddleware;
