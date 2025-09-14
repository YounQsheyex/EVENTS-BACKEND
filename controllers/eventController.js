/*-----------------------------------------------
-------------------------------------------------
Ezekiel's Event Controller
-------------------------------------------------
This file contains all the controller functions 
for handling event-related API routes.
- Create event
- Get events (all, by category, by status, by ID, etc.)
- Manage attendees
- Manage seats
- Update / Delete events
-------------------------------------------------
-------------------------------------------------*/

const Event = require("../models/eventSchema.js");
const Ticket = require("../models/ticketSchema.js");

/*-----------------------------------------------
 Create Event
-------------------------------------------------
- Takes event details from the request body
- Validates required fields (title, location, dates, seats)
- Checks if a similar event already exists 
  (same title, same location, same start date)
- If valid, creates and saves the event in DB
-------------------------------------------------*/
const createEvents = async (req, res, next) => {
  try {
    const {
      title,
      description,
      location,
      eventStart,
      eventEnd,
      totalSeats,
      ticketCategories,
      coverImage,
      category,
    } = req.body;

    // ✅ Step 1: Validate required fields
    if (!title || !location || !eventStart || !eventEnd || !totalSeats) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields." });
    }

    // ✅ Step 2: Ensure event uniqueness
    const existingEvent = await Event.findOne({
      title,
      location,
      eventStart,
    });

    if (existingEvent) {
      return res.status(400).json({
        success: false,
        message: "Event already exists at this time/location.",
      });
    }

    // ✅ Step 3: Create and save event
    const event = await Event.create({
      title,
      description,
      location,
      eventStart,
      eventEnd,
      totalSeats,
      coverImage,
      category,
      ticketCategories,
    });

    res.status(201).json({ success: true, event });
  } catch (error) {
    next(error);
  }
};

/*-----------------------------------------------
 Get All Events
-------------------------------------------------
- Fetches all events from DB
- Populates ticket data (ticketType, price)
- Returns events in JSON format
-------------------------------------------------*/
const getEvents = async (req, res, next) => {
  try {
    const events = await Event.find().populate("tickets", "ticketType price");
    res.status(200).json({ success: true, events });
  } catch (error) {
    next(error);
  }
};

/*-----------------------------------------------
 Get Events by Category
-------------------------------------------------
- Reads category from request params
- Checks if category is valid (from schema enums)
- Fetches events that match the category
- Returns 404 if no events found
-------------------------------------------------*/
const getEventsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;

    const allowedCategory = Event.schema.path("category").enumValues;

    if (!allowedCategory.includes(category.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid event category.",
      });
    }

    const eventsByCategory = await Event.find({
      category: category.toLowerCase(),
    });

    if (!eventsByCategory.length) {
      return res.status(404).json({
        success: false,
        message: `Sorry, no event found under "${category}" category.`,
      });
    }

    res.status(200).json({ success: true, events: eventsByCategory });
  } catch (error) {
    next(error);
  }
};

/*-----------------------------------------------
 Get Events by Status
-------------------------------------------------
- Works the same way as category
- Reads "status" (e.g., upcoming, past, canceled)
- Checks against schema enums
- Returns matching events
-------------------------------------------------*/
const getEventsByStatus = async (req, res, next) => {
  try {
    const { status } = req.params;

    const allowedStatus = await Event.schema.path("status").enumValues;

    if (!allowedStatus.includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid event status.",
      });
    }

    const eventsByStatus = await Event.find({ status: status.toLowerCase() });

    if (!eventsByStatus.length) {
      return res.status(404).json({
        success: false,
        message: `Sorry, no event found under "${status}" status.`,
      });
    }

    res.status(200).json({ success: true, events: eventsByStatus });
  } catch (error) {
    next(error);
  }
};

/*-----------------------------------------------
 Get Events with Limit + Pagination
-------------------------------------------------
- Uses query params ?limit=6&page=1
- Caps limit at 50, page at 10,000 to avoid DB overload
- Returns paginated events + metadata 
  (total events, total pages, current page)
-------------------------------------------------*/
const getEventsByLimit = async (req, res, next) => {
  try {
    const { limit = 6, page = 1 } = req.query;

    const lmt = Math.min(parseInt(limit), 50);
    const pg = Math.min(parseInt(page), 10000);

    const eventsByStatus = await Event.find()
      .limit(lmt)
      .skip((parseInt(pg) - 1) * lmt)
      .lean();

    const totalEvents = await Event.countDocuments();

    res.status(200).json({
      success: true,
      events: eventsByStatus,
      totalEvents,
      totalPages: Math.ceil(totalEvents / lmt),
      currentPage: pg,
    });
  } catch (error) {
    next(error);
  }
};

/*-----------------------------------------------
 Get Event by ID
-------------------------------------------------
- Reads event id from params
- Returns event if found, else 404
-------------------------------------------------*/
const getEventsById = async (req, res, next) => {
  try {
    const id = req.params?.id;

    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Event id is required." });

    const eventWithId = await Event.findById(id);

    if (!eventWithId)
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });

    res.status(200).json({ success: true, event: eventWithId });
  } catch (error) {
    next(error);
  }
};

/*-----------------------------------------------
 Get Attendees for an Event
-------------------------------------------------
- Finds tickets purchased for a given event
- Populates user details (name, email)
- Returns a list of users attending the event
-------------------------------------------------*/
const getEventAttendees = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Event id is required." });

    const event = await Event.findById(id);
    if (!event)
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });

    const tickets = await Ticket.find({ event: id }).populate(
      "user",
      "name email"
    );

    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No attendees found for this event yet.",
      });
    }

    const users = tickets.map((t) => t.user);

    res.status(200).json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

/*-----------------------------------------------
 Get Event Seat Stats
-------------------------------------------------
- Returns total seats + remaining seats
- Useful for frontend availability display
-------------------------------------------------*/
const getEventStats = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Event id is required." });

    const event = await Event.findById(id).select("totalSeats remainingSeats");
    if (!event)
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });

    res.status(200).json({
      success: true,
      seats: {
        total: event.totalSeats,
        remaining: event.remainingSeats,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*-----------------------------------------------
 Update Event by ID
-------------------------------------------------
- Allows updating event details 
  (location, title, category, description, status, start/end dates)
- Validates:
  • Event must exist
  • Event must not have started or ended
  • At least one field must be updated
-------------------------------------------------*/
const updateEventbyId = async (req, res, next) => {
  try {
    const id = req.params?.id;
    const {
      location,
      title,
      category,
      description,
      status,
      eventStart,
      eventEnd,
    } = req.body;

    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Event id is required." });

    const event = await Event.findOne({ _id: id });

    if (!event)
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });

    if (new Date(event.eventEnd).getTime() <= Date.now())
      return res.status(400).json({
        success: false,
        message: `Event has ended since ${event.eventEnd}.`,
      });

    if (new Date(event.eventStart) <= Date.now())
      return res.status(400).json({
        success: false,
        message: `Event has started since ${event.eventStart}.`,
      });

    if (
      !location &&
      !title &&
      !category &&
      !description &&
      !status &&
      !eventStart &&
      !eventEnd
    )
      return res.status(400).json({
        success: false,
        message: "You need to make a change in a field.",
      });

    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      { location, title, category, description, status, eventStart, eventEnd },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Event Updated successfully",
      updatedEvent,
    });
  } catch (error) {
    next(error);
  }
};

/*-----------------------------------------------
 Delete Event by ID
-------------------------------------------------
- Finds an event by ID
- If found, deletes it from DB
- Returns confirmation message
-------------------------------------------------*/
const deleteEventById = async (req, res, next) => {
  try {
    const id = req.params?.id;

    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Event id is required." });

    const event = await Event.findOne({ _id: id });

    if (!event)
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });

    await event.deleteOne();

    res
      .status(200)
      .json({ success: true, message: "Event deleted successfully." });
  } catch (error) {
    next(error);
  }
};

/*-----------------------------------------------
 Export Controllers
-------------------------------------------------
These functions are imported in the event routes
to connect API endpoints with DB logic.
-------------------------------------------------*/
module.exports = {
  createEvents,
  getEvents,
  getEventAttendees,
  getEventsByCategory,
  getEventsByLimit,
  getEventsByStatus,
  getEventsById,
  getEventStats,
  deleteEventById,
  updateEventbyId,
};
