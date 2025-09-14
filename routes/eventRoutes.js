/*-----------------------------------------------
 Event Routes
-------------------------------------------------
- Defines all the API endpoints for events
- Connects routes to controller functions
- Example:
   GET /api/events → getEvents
   POST /api/events → createEvents
-------------------------------------------------*/

const express = require("express");
const router = express.Router();

// Import event controllers
const {
  createEvents,
  getEvents,
  getEventsByCategory,
  getEventsByStatus,
  getEventsByLimit,
  getEventsById,
  getEventStats,
  getEventAttendees,
  updateEventbyId,
  deleteEventById,
} = require("../controllers/eventController.js");
const { isAdmin, authMiddleware } = require("../middleware/auth.js");

/*-----------------------------------------------
 Event Endpoints
-------------------------------------------------
- Each route maps to a function in the controller
- REST naming conventions used
-------------------------------------------------*/

// ✅ Create a new event
router.post("/", authMiddleware, isAdmin, createEvents);

// ✅ Get all events (with ticket info populated)
router.get("/", getEvents);

// ✅ Get events by category (e.g., /api/events/category/other)
router.get("/category/:category", getEventsByCategory);

// ✅ Get events by status (e.g., /api/events/status/upcoming)
router.get("/status/:status", getEventsByStatus);

// ✅ Get events with pagination & limit (e.g., /api/events/limit?limit=6&page=1)
router.get("/limit", getEventsByLimit);

// ✅ Get a single event by ID
router.get("/:id", getEventsById);

// ✅ Get seat stats for a specific event
router.get("/:id/stats", authMiddleware, isAdmin, getEventStats);

// ✅ Get attendees for a specific event
router.get("/:id/attendees", authMiddleware, isAdmin, getEventAttendees);

// ✅ Update event by ID
router.patch("/:id", authMiddleware, isAdmin, updateEventbyId);

// ✅ Delete event by ID
router.delete("/:id", authMiddleware, isAdmin, deleteEventById);

module.exports = router;
