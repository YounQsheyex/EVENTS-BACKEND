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
  deleteDraftedEvent,
  getLiveEvents, // Filter events by query params
} = require("../controllers/eventController");

// Import middleware for checking admin authorization
const { isAdmin, isUser } = require("../middleware/auth");
const cache = require("../middleware/redisMiddleware");

// Initialize an Express router instance
const router = require("express").Router();

// ----------------------------------------------------------------------
// GET ROUTES (FIXED ORDER)
// Define fixed-string endpoints FIRST to avoid conflicts with :id
// ----------------------------------------------------------------------

// Route: GET /api/events
// Fetch all events and cache the response
router.get("/", cache("All events: "), getAllEvents);

// Route: GET /api/events/drafts
// Fetch all draft events and cache the response
router.get("/drafts", cache("All draft events: "), getDraftEvents);

// Route: GET /api/events/live
// Fetch all live events and cache the response
router.get("/live", cache("All live events: "), getLiveEvents);

// Route: GET /api/events/upcoming?page=pageNumber
// Fetch events with category = "upcoming" and cache the response with key "All upcoming events: params or query"

// Route: GET /api/events/upcoming
// Fetch events with category = "upcoming" and cache the response

router.get("/upcoming", cache("All upcoming events: "), getAllUpComingEvents);

// Route: GET /api/events/filterby?field=value
// Filter events by query (e.g. ?location=Lagos) and cache the response
router.get("/filterby", cache("Filter event: "), filterEvent);

// ----------------------------------------------------------------------
// GET ROUTES (PARAMETERIZED)
// Define routes with parameters like :id LAST
// ----------------------------------------------------------------------

// Route: GET /api/events/:id
// Fetch event by ID and cache the response. This MUST be the last GET route.
router.get("/:id", cache("Event details: "), getEventById);

// ----------------------------------------------------------------------
// POST / PATCH / DELETE ROUTES (Order is less critical here, but good practice)
// ----------------------------------------------------------------------

// Route: POST /api/events/draft
// Draft new event (admin only)
router.post("/drafts", isUser, isAdmin, createEvents);

// Route: POST /api/events/create
// Create new event (admin only)
router.post("/create/:id", isUser, isAdmin, createEvents);

// Route: POST /api/events/update/drafts/:id
// Update drafted event by ID (admin only)
router.patch("/update/drafts/:id", isUser, isAdmin, updateEvent);

// Route: POST /api/events/update/:id
// Update event by ID (admin only)
router.patch("/update/:id", isUser, isAdmin, updateEvent);

// Route: POST /api/events/cancel/:id
// Cancel an event by ID (admin only)
router.patch("/cancel/:id", isUser, isAdmin, cancelEvent);

// Route: DELETE /api/events/delete/:id
// Delete event by ID (admin only)
router.delete("/delete/:id", isUser, isAdmin, deleteEvent);

// Route: GET /api/events/:id
// Fetch event by ID and cache the response
router.get("/:id", cache("Event details: "), getEventById);

// Export router so it can be used in server.js / app.js
module.exports = router;
