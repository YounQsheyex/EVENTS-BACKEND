// Global error-handling middleware for Express
// Catches errors from routes/controllers and returns consistent JSON responses
const errorMiddleware = async (err, req, res, next) => {
  try {
    // Make a shallow copy of the error object
    let error = { ...err };

    // Explicitly copy the original error message
    error.message = err.message;

    // Log error to console (good for debugging in dev)
    console.error(err.message);

    // 🔹 Handle invalid MongoDB ObjectId (e.g. wrong format in :id params)
    if (err.name === "CastError") {
      const message = "Resource not found";
      error = new Error(message);
      error.statusCode = 404;
    }

    // 🔹 Handle duplicate key errors (e.g. inserting a unique field twice)
    if (err.code === 11000) {
      const message = "Duplicate field value entered";
      error = new Error(message);
      error.statusCode = 400;
    }

    // 🔹 Handle Mongoose validation errors (missing required fields, etc.)
    if (err.name === "ValidationError") {
      // Collect all validation messages into one string
      const message = Object.values(err.errors).map((val) => val.message);
      error = new Error(message.join(", "));
      error.statusCode = 400;
    }

    // Send a JSON response with the status code and message
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  } catch (error) {
    // Fallback: if something goes wrong inside this middleware itself
    res.status(500).json({ success: false, error });
  }
};

module.exports = errorMiddleware;
