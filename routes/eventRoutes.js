// Import event controller functions
const {
  getAllEvents, // Fetch all events
  getAllUpComingEvents, // Fetch all upcoming events
  createEvents, // Create a new event
  updateEvent, // Update an existing event by ID
  deleteEvent, // Delete an event by ID
  cancelEvent, // Mark an event as cancelled
  filterEvent,
  draftEvents,
  getEventById,
  getDraftEvents,
  getDraftedEventById,
  deleteDraftedEvent, // Filter events by query params
} = require("../controllers/eventController");

// Import middleware for checking admin authorization
const { isAdmin, isUser } = require("../middleware/auth");
const cache = require("../middleware/redisMiddleware");

// Initialize an Express router instance
const router = require("express").Router();

// Route: GET /api/events
// Fetch all events and cache the response
router.get("/", cache("All events: "), getAllEvents);

// Route: GET /api/events/draft
// Fetch all draft events and cache the response
router.get("/drafts", cache("All draft events: "), getDraftEvents);

// Route: GET /api/events/upcoming?page=pageNumber
// Fetch events with category = "upcoming" and cache the response with key "All upcoming events: params or query"
router.get("/upcoming", cache("All upcoming events: "), getAllUpComingEvents);

// Route: GET /api/events/filterby?field=value
// Filter events by query (e.g. ?location=Lagos) and cache the response with key "Filter event: params or query"
router.get("/filterby", cache("Filter event: "), filterEvent);
// Route: GET /api/events/filterby?field=value
// Filter events by query (e.g. ?location=Lagos) and cache the response with key "Filter event: params or query"
router.get("/filterby/draft", cache("Filter Draft events: "), filterEvent);

// Route: POST /api/events/create
// Create new event (admin only)
router.post("/create", isUser, isAdmin, createEvents);

// Route: POST /api/events/draft
// Draft new event (admin only)
router.post("/create/drafts", isUser, isAdmin, draftEvents);

// Route: POST /api/events/update/:id
// Update event by ID (admin only)
router.patch("/update/:id", isUser, isAdmin, updateEvent);

// Route: POST /api/events/update/drafts/:id
// Update drafted event by ID (admin only)
router.patch("/update/drafts/:id", isUser, isAdmin, updateEvent);

// Route: POST /api/events/cancel/:id
// Cancel an event by ID (admin only)
router.patch("/cancel/:id", isUser, isAdmin, cancelEvent);

// Route: DELETE /api/events/delete/:id
// Delete event by ID (admin only)
router.delete("/delete/:id", isUser, isAdmin, deleteEvent);

// Route: DELETE /api/events/drafts/delete/:id
// Delete drafted event by ID (admin only)
router.delete("/drafts/delete/:id", isUser, isAdmin, deleteDraftedEvent);

// Route: GET /api/events/:id
// Fetch event by ID and cache the response
router.get("/:id", cache("Event details: "), getEventById);

// Route: GET /api/events/drafts/:id
// Fetch event by ID and cache the response
router.get("/drafts/:id", cache("Draft event details: "), getDraftedEventById);

// Export router so it can be used in server.js / app.js
module.exports = router;
