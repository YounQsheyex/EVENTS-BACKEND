// Import mongoose utility for starting sessions (used for transactions)
const { startSession } = require("mongoose");

// Import the main dayjs library
const dayjs = require("dayjs");

// Import the plugins we need for event date and time
// timezone plugin -> lets you work with specific timezones
const tz = require("dayjs/plugin/timezone");

// utc plugin -> lets you handle UTC conversions
const utc = require("dayjs/plugin/utc");

// Import Event model (MongoDB schema for events)
const EVENTS = require("../models/eventSchema");
const redisConfig = require("../helpers/redis");
const geocodeLocation = require("../helpers/locator.js");

// Import Cloudinary for image uploads
const cloudinary = require("cloudinary").v2;

// Register (extend) the plugins with dayjs so they can be used
dayjs.extend(utc);
dayjs.extend(tz);

/* ========================
   GET ALL EVENTS (paginated)
   ======================== */
const getAllEvents = async (req, res, next) => {
  try {
    const { page, limit } = req.query; // Get current page from query
    const pg = parseInt(page) || 1; // default to 1

    // total count (for info / frontend)
    const eventsCount = await EVENTS.countDocuments();
    const lmt = parseInt(limit) || 5; // items per page default to 5
    const skip = (pg - 1) * lmt; // how many to skip

    const events = await EVENTS.find({}).skip(skip).limit(lmt).lean();

    // If no events, return 404
    if (!events.length)
      return res.status(404).json({
        success: false,
        message: "No event found.",
        events: [],
      });

    // Success: send events
    res.status(200).json({
      success: true,
      events,
      totalEvents: eventsCount,
    });
  } catch (error) {
    // Pass errors to error middleware
    next(error);
  }
};

/* =========================
   GET UPCOMING EVENTS ONLY
   ========================= */
const getAllUpComingEvents = async (req, res, next) => {
  // Count events that belong to "upcoming" status
  const eventsCount = await EVENTS.countDocuments({ status: "upcoming" });
  try {
    const { page, limit } = req.query; // Get current page from query
    const pg = parseInt(page) || 1; // default to 1
    const lmt = parseInt(limit) || 5; // items per page default to 5

    const skip = (pg - 1) * lmt; // how many to skip
    const events = await EVENTS.find({ status: "upcoming" })
      // Skip logic for pagination
      .skip(skip)
      // Show only 6 per page
      .limit(lmt)
      .lean();

    // If no upcoming events, return 404
    if (!events.length)
      return res.status(404).json({
        success: false,
        message: "No upcoming event found.",
        events: [],
        totalUpcomingEvents: eventsCount,
      });

    // Success: return list of upcoming events
    res
      .status(200)
      .json({ success: true, events, totalUpcomingEvents: eventsCount });
  } catch (error) {
    next(error);
  }
};

/* ========================
   CREATE EVENT
   ======================== */
const createEvents = async (req, res, next) => {
  // Start MongoDB session for transaction safety
  const session = await startSession();
  session.startTransaction();
  try {
    // Extract data from request body
    const {
      title,
      description,
      highlight,
      location,
      eventDate,
      eventStart,
      eventEnd,
      price,
      category,
      ticketTypes,
    } = req.body;

    let ticketTypesJson = {};

    if (typeof ticketTypes === "string") {
      ticketTypesJson = JSON.parse(ticketTypes);
    }
    await redisConfig.flushall("ASYNC");

    // Validate required fields
    if (
      !title ||
      !description ||
      !highlight ||
      !location ||
      !eventDate ||
      !eventStart ||
      !eventEnd ||
      !price ||
      !category ||
      !ticketTypesJson.length
    )
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });

    // Ensure event image is uploaded
    if (!req.files.file.tempFilePath)
      return res
        .status(400)
        .json({ success: false, message: "Event image is required." });

    // Parse request body
    const eventDateObj = dayjs(eventDate, "YYYY-MM-DD").toDate();
    const eventStartObj = dayjs(eventStart, "YYYY-MM-DD HH:mm:ss").toDate();

    // Prevent duplicate events by checking unique combo
    const existingEvent = await EVENTS.findOne({
      location,
      eventDate: eventDateObj,
      eventStart: eventStartObj,
    });

    if (existingEvent)
      return res
        .status(400)
        .json({ success: false, message: "Event already exists." });

    // Event locus for map positions on the frontend map.
    const eventlocus = await geocodeLocation(location);

    // Upload image to Cloudinary
    const uploadImage = await cloudinary.uploader.upload(
      req.files.file.tempFilePath,
      {
        folder: "Eventra/events",
        unique_filename: false,
        use_filename: true,
      }
    );

    // E.g:==> Create a date for "2025-09-21 15:15" in Africa/Lagos timezone
    //  - "2025-09-21 15:15" is just a string (local representation)
    //  - "Africa/Lagos" tells dayjs which timezone to interpret that string in
    // This returns a Dayjs object in that timezone
    // `.toDate()` converts it into a native JavaScript Date object
    // eventDate = dayjs.tz("2025-09-21 15:15", "Africa/Lagos").toDate();

    // Create new event document inside a transaction
    const event = await EVENTS.create(
      [
        {
          title,
          description,
          highlight,
          location,
          eventDate: dayjs.tz(eventDate, "Africa/Lagos").toDate(),
          eventStart: dayjs.tz(eventStart, "Africa/Lagos").toDate(),
          eventEnd: dayjs.tz(eventEnd, "Africa/Lagos").toDate(),
          eventImage: uploadImage.secure_url, // Store Cloudinary image URL
          price,
          category,
          ticketTypes: ticketTypesJson,
          coordinates: eventlocus,
        },
      ],
      { session }
    );

    // Commit transaction (make changes permanent)
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Event created successfully",
      event: event[0], // Return created event
    });
  } catch (error) {
    // Rollback transaction if error
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/* ========================
   FILTER EVENTS
   ======================== */
const filterEvent = async (req, res, next) => {
  try {
    let feedback = {}; // Object to store filter details for user messages

    // Function to refine incoming query params
    function filterBy(query) {
      for (const q in query) {
        feedback["filterBy"] = q;
        feedback["search"] = query[q];

        switch (query[q]) {
          // Handle URL-encoded spaces (%20)
          case query[q].includes("%20"):
            query[q] = query[q].replaceAll("%20", " ");
            return query;

          // Handle plus signs (+) as spaces
          case query[q].includes("+"):
            query[q] = query[q].replaceAll("+", " ");
            return query;

          // Convert numeric type DB schema fields to numbers
          case q === "price":
            query[q] = Number(query[q]);
            return query;

          default:
            return query;
        }
      }
    }

    // Fetch events based on processed query
    let events = await EVENTS.find(filterBy(req.query));

    // If none found, send descriptive message
    if (!events.length)
      return res.status(404).json({
        success: false,
        message: `No event with ${feedback["filterBy"]} given as ${
          feedback["filterBy"] === "price" ? "$" : ""
        }${feedback["search"] ? feedback["search"] : "empty"} was found.`,
      });

    // Success
    res.status(200).json({ success: true, events });
  } catch (error) {
    next(error);
  }
};

/* ========================
   UPDATE EVENT
   ======================== */
const updateEvent = async (req, res, next) => {
  try {
    // Ensure request body is not empty
    if (!req.body)
      return res
        .status(400)
        .json({ success: false, message: "Content to update is not provided" });

    // Refine update body to ensure price is stored in DB as a number and event coordinates are generated
    async function refinedBody(body = req.body) {
      if (body.hasOwnProperty("price")) {
        body["price"] = Number(body["price"]);
      } else if (body.hasOwnProperty("location")) {
        body["coordinates"] = await geocodeLocation(body["location"]);
      }
      return body;
    }

    // Update event by the event's ID and return only its name
    const event = await EVENTS.findByIdAndUpdate(req.params.id, refinedBody(), {
      new: true,
    }).select("title -_id");

    // Success message including updated fields and the updated event's name
    res.status(200).json({
      success: true,
      message: `Successfully updated the ${Object.keys(req.body).join(
        ", "
      )} of the ${event.name} event.`,
    });
  } catch (error) {
    next(error);
  }
};

/* ========================
   CANCEL EVENT
   ======================== */
const cancelEvent = async (req, res, next) => {
  try {
    // Ensure event ID is provided
    if (!req.params.id)
      return res.status(400).json({
        success: false,
        message: "Event id is required.",
      });

    // Update event status to cancelled
    await EVENTS.findByIdAndUpdate(req.params.id, { status: "cancelled" });

    res
      .status(200)
      .json({ success: true, message: "Event cancelled successfully." });
  } catch (error) {
    next(error);
  }
};

/* ========================
   DELETE EVENT
   ======================== */
const deleteEvent = async (req, res, next) => {
  try {
    // Ensure event ID is provided
    if (!req.params.id)
      return res.status(400).json({
        success: false,
        message: "Event id is required.",
      });

    // Permanently delete event
    await EVENTS.findByIdAndDelete(req.params.id);

    res
      .status(200)
      .json({ success: true, message: "Event deleted successfully." });
  } catch (error) {
    next(error);
  }
};

/* ========================
   EXPORT CONTROLLERS
   ======================== */
module.exports = {
  getAllEvents,
  getAllUpComingEvents,
  createEvents,
  filterEvent,
  updateEvent,
  cancelEvent,
  deleteEvent,
};
