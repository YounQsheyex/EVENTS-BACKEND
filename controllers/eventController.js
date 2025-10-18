// Import mongoose utility for starting sessions (used for transactions)
const { startSession, default: mongoose } = require("mongoose");

// Import the main dayjs library
const dayjs = require("dayjs");

// Import the plugins we need for event date and time
// timezone plugin -> lets you work with specific timezones
const tz = require("dayjs/plugin/timezone");

// utc plugin -> lets you handle UTC conversions
const utc = require("dayjs/plugin/utc");

// Import Event model (MongoDB schema for events)
const EVENTS = require("../models/eventSchema.js");

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
    const lmt = parseInt(limit) || 100; // items per page default to 100
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
  const eventsCount = await EVENTS.countDocuments({
    status: "upcoming",
    isDraft: "live",
  });
  try {
    const { page, limit } = req.query; // Get current page from query
    const pg = parseInt(page) || 1; // default to 1
    const lmt = parseInt(limit) || 8; // items per page default to 8

    const skip = (pg - 1) * lmt; // how many to skip
    const events = await EVENTS.find({ status: "upcoming", isDraft: "live" })
      // Skip logic for pagination
      .skip(skip)
      // Show only 8 per page
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

// ========================
// GET EVENT BY ID
// ========================
const getEventById = async (req, res, next) => {
  try {
    const event = await EVENTS.findById(req.params.id).lean();
    if (!event)
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });

    // Success: return event details
    res.status(200).json({ success: true, event });
  } catch (error) {
    next(error);
  }
};

/* ========================
   GET DRAFT EVENTS
   ======================= */
const getDraftEvents = async (req, res, next) => {
  try {
    const events = await EVENTS.find({ isDraft: "draft" })
      .lean()
      .select("title id eventDate price status");

    if (!events.length)
      return res
        .status(404)
        .json({ success: false, message: "No drafted event found." });

    // Success: return event details
    res.status(200).json({ success: true, events });
  } catch (error) {
    next(error);
  }
};

/* ========================
   GET DRAFT EVENTS
   ======================= */
const getLiveEvents = async (req, res, next) => {
  try {
    const events = await EVENTS.find({ isDraft: "live" })
      .lean()
      .select("title id eventDate price status");

    if (!events.length)
      return res
        .status(404)
        .json({ success: false, message: "No live event found." });

    // Success: return event details
    res.status(200).json({ success: true, events });
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
      maxCapacity,
      price,
      category,
      status,
      ticketTypes,
      eventImage,
    } = req.params.id ? await EVENTS.findById(req.params.id) : req.body;

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
      maxCapacity === undefined
    )
      if (!req.url.includes("draft"))
        return res.status(400).json({
          success: false,
          message: "All fields are required.",
        });

    // Ensure event image is uploaded
    if (
      !req.files?.file.tempFilePath &&
      !eventImage &&
      req.url.includes("draft")
    )
      return res.status(400).json({
        success: false,
        message: "Event image is required but no image is provided.",
      });

    // Parse request body
    const eventDateObj = dayjs(eventDate, "YYYY-MM-DD").toDate();
    const eventStartObj = dayjs(eventStart, "YYYY-MM-DD HH:mm:ss").toDate();

    // Prevent duplicate events by checking unique combo
    const existingEvent =
      location && eventDateObj && eventStartObj
        ? await EVENTS.findOne({
            location,
            eventDate: eventDateObj,
            eventStart: eventStartObj,
          })
        : false;

    if (existingEvent && req.url.includes("drafts"))
      return res
        .status(400)
        .json({ success: false, message: "Event already exists." });

    // Event locus for map positions on the frontend map.
    const eventlocus = await geocodeLocation(location);

    // Upload image to Cloudinary
    let uploadImage = eventImage;

    if (!uploadImage && !req.files.file.tempFilePath) {
      // Upload image to Cloudinary
      uploadImage = await cloudinary.uploader.upload(
        req.files.file.tempFilePath,
        {
          folder: "Eventra/events",
          unique_filename: false,
          use_filename: true,
        }
      );
    }

    // E.g:==> Create a date for "2025-09-21 15:15" in Africa/Lagos timezone
    //  - "2025-09-21 15:15" is just a string (local representation)
    //  - "Africa/Lagos" tells dayjs which timezone to interpret that string in
    // This returns a Dayjs object in that timezone
    // `.toDate()` converts it into a native JavaScript Date object
    // eventDate = dayjs.tz("2025-09-21 15:15", "Africa/Lagos").toDate();

    const eventObj = {
      title,
      description,
      highlight,
      location,
      availableSeats: maxCapacity,
      eventDate: dayjs.tz(eventDate, "Africa/Lagos").toDate(),
      eventStart: dayjs.tz(eventStart, "Africa/Lagos").toDate(),
      eventEnd: dayjs.tz(eventEnd, "Africa/Lagos").toDate(),
      eventImage: eventImage ? eventImage : uploadImage.secure_url, // Store Cloudinary image URL
      maxCapacity,
      price,
      category,
      status,
      ticketTypes: ticketTypes ? [ticketTypes] : [],
    };

    if (eventlocus) {
      eventObj["coordinates"] = eventlocus;
    }

    // Create new event document inside a transaction
    const event = !req.params.id
      ? await EVENTS.create([eventObj], { session })
      : await EVENTS.findByIdAndUpdate(req.params.id, {
          isDraft: "live",
          ...eventObj,
        });

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
    let filterObj = {},
      query = req.query;

    // Function to refine incoming query params
    for (const filter in query) {
      if (["title", "location", "category", "status"].includes(filter)) {
        query[filter] = query[filter]
          .replaceAll("%20", " ")
          .replaceAll("+", " ");
        filterObj[filter] = query[filter];
      } else if (filter === "price" || filter === "maxcapacity") {
        filterObj["price"] = query[filter] === "paid" ? { $gte: 1 } : 0;
      } else if (filter === "seats") {
        filterObj["availableSeats"] =
          query[filter] === "available" ? { $gte: 1 } : 0;
      } else if (filter === "date") {
        filterObj["eventDate"] = new Date(query[filter]);
      } else if (
        Object.keys(query).includes("end") &&
        Object.keys(query).includes("start")
      ) {
        filterObj["eventDate"] = {
          $lte: new Date(query["end"]).toISOString(),
          $gte: new Date(query["start"]).toISOString(),
        };
      } else if (filter === "start") {
        filterObj["eventDate"] = {
          $gte: new Date(query[filter]).toISOString(),
        };
      } else if (filter === "end") {
        filterObj["eventDate"] = {
          $lte: new Date(query[filter]).toISOString(),
        };
      }
    }

    filterObj.isDraft = "live";

    // Fetch events based on processed query
    let events = await EVENTS.find(filterObj)
      .sort("asc")
      .skip((query.page ? query.page - 1 : 0) * 8)
      .limit(8);

    const totalMatches = await EVENTS.countDocuments(filterObj);

    // If none found, send descriptive message
    if (!events.length)
      return res.status(404).json({
        success: false,
        message: `No event with ${Object.keys(filterObj).join()} given as ${
          Object.keys(filterObj).includes("price") ? "$" : ""
        }${
          Object.values(filterObj) ? Object.values(filterObj) : "empty"
        } was found.`,
      });

    // Success
    res.status(200).json({ success: true, events, totalMatches });
  } catch (error) {
    next(error);
  }
};

/* ========================
   UPDATE EVENT
   ======================== */
const updateEvent = async (req, res, next) => {
  try {
    // Check for empty body/files
    if (
      (!req.body || Object.keys(req.body).length === 0) &&
      (!req.files || Object.keys(req.files).length === 0)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Content to update is not provided" });
    }

    // Refine update body
    const refinedBody = async () => {
      const body = { ...req.body };

      if (body.price !== undefined) {
        body.price = Number(body.price);
      }

      if (body.availableSeats !== undefined && body.availableSeats >= 0) {
        body.availableSeats = Number(body.availableSeats);
      }

      if (body.maxCapacity !== undefined && body.maxCapacity >= 2) {
        body.maxCapacity = Number(body.maxCapacity);
      }

      if (typeof body.coordinates === "string") {
        body.coordinates = body.coordinates.split(", ");
      }

      if (body.location) {
        console.log("location:", body.location);
        const locate = await geocodeLocation(body.location);
        console.log("geocodeLocation:", locate);
        if (!locate && !body.coordinates.length)
          return res.status(400).json({
            success: false,
            message:
              "Please Provide the coordinates of this suggested location.",
          });

        body.coordinates = locate;
      }

      if (req.files?.file) {
        if (!req.files.file.tempFilePath) {
          return res
            .status(400)
            .json({ success: false, message: "Event image is required." });
        }

        const uploadImage = await cloudinary.uploader.upload(
          req.files.file.tempFilePath,
          {
            folder: "Eventra/events",
            unique_filename: false,
            use_filename: true,
          }
        );

        body.eventImage = uploadImage.secure_url;
      }

      return body;
    };

    const refined = await refinedBody();

    // Update event and return only its title
    const event = await EVENTS.findByIdAndUpdate(
      req.params.id,
      { $set: refined },
      { new: true }
    ).select("title _id");

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found!",
      });
    }

    // Caution: this clears *all* Redis keys
    await redisConfig.flushall("ASYNC");

    res.status(200).json({
      success: true,
      message: `Successfully updated ${Object.keys(refined)
        .join(", ")
        .replace(/, ([^,]*)$/, " and $1")} of the ${event.title} event.`,
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
    const event = await EVENTS.findByIdAndUpdate(req.params.id, {
      status: "cancelled",
    });

    if (!event)
      return res.status(404).json({
        success: false,
        message: "Event not found!",
      });

    await redisConfig.flushall("ASYNC");

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
    const event = await EVENTS.findByIdAndDelete(req.params.id);

    if (!event)
      return res.status(404).json({
        success: false,
        message: "Event not found!",
      });

    await redisConfig.flushall("ASYNC");

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
  getEventById,
  getDraftEvents,
  getLiveEvents,
  createEvents,
  filterEvent,
  updateEvent,
  cancelEvent,
  deleteEvent,
};
