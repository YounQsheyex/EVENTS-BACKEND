// Import event controller functions
const {
  getAllEvents, // Fetch all events
  getAllUpComingEvents, // Fetch all upcoming events
  createEvents, // Create a new event
  updateEvent, // Update an existing event by ID
  deleteEvent, // Delete an event by ID
  cancelEvent, // Mark an event as cancelled
  filterEvent, // Filter events by query params
} = require("../controllers/eventController");

// Import middleware for checking admin authorization
const { isAdmin, isUser } = require("../middleware/auth");

// Initialize an Express router instance
const router = require("express").Router();

// Route: GET /api/events
// Fetch all events
router.get("/", getAllEvents);

// Route: GET /api/events/upcoming?page=pageNumber
// Fetch events with category = "upcoming"
router.get("/upcoming", getAllUpComingEvents);

// Route: GET /api/events/filterby?field=value
// Filter events by query (e.g. ?location=Lagos)
router.get("/filterby", filterEvent);

// Route: POST /api/events/create
// Create new event (admin only)
router.post("/create", isUser, isAdmin, createEvents);

// Route: POST /api/events/update/:id
// Update event by ID (admin only)
router.patch("/update/:id", isUser, isAdmin, updateEvent);

// Route: POST /api/events/cancel/:id
// Cancel an event by ID (admin only)
router.patch("/cancel/:id", isUser, isAdmin, cancelEvent);

// Route: DELETE /api/events/delete/:id
// Delete event by ID (admin only)
router.delete("/delete/:id", isUser, isAdmin, deleteEvent);

// Export router so it can be used in server.js / app.js
module.exports = router;
