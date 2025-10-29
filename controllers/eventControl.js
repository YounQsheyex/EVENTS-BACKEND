const EVENTS = require("../models/eventsSchemaa");
const cloudinary = require("cloudinary").v2;
const {
  combineDateAndTime,
  parseFlexibleTimeTo24,
} = require("../helpers/combineDateandTime");

// Creating events
const createEvents = async (req, res) => {
  let {
    title,
    description,
    category,
    capacity,
    perks,
    startDate,
    endDate,
    startTime,
    endTime,
    address,
    tickets,
    status,
  } = req.body;

  if (
    !title ||
    !description ||
    !category ||
    !capacity ||
    !perks ||
    !startDate ||
    !endDate ||
    !startTime ||
    !endTime ||
    !address ||
    !tickets ||
    !status
  ) {
    return res.status(400).json({ message: "Please fill all fields" });
  }

  try {
    // Convert times to 24-hour format FIRST
    startTime = parseFlexibleTimeTo24(startTime);
    endTime = parseFlexibleTimeTo24(endTime);

    // Validate time format
    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Invalid time format. Use HH:MM or HH:MM AM/PM format.",
      });
    }

    const now = new Date();

    // Combine date and time for accurate validation
    const eventStartDateTime = combineDateAndTime(
      new Date(startDate),
      startTime
    );
    const eventEndDateTime = combineDateAndTime(new Date(endDate), endTime);

    // 1. Validate start date/time is not in the past
    if (eventStartDateTime < now) {
      return res.status(400).json({
        success: false,
        message: "Event start date and time cannot be in the past.",
      });
    }

    // 2. Validate end date/time is after start date/time
    if (eventEndDateTime <= eventStartDateTime) {
      return res.status(400).json({
        success: false,
        message: "Event end date and time must be after start date and time.",
      });
    }

    // Check admin permissions
    if (!["admin", "superAdmin"].includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Access denied. Only admins can create events." });
    }

    // Strict duplicate check
    const duplicateEvent = await EVENTS.findOne({
      $and: [{ address }, { startDate }, { startTime }],
    });

    if (duplicateEvent) {
      return res.status(400).json({
        success: false,
        message:
          "An event with the same venue, date, and time already exists. Please adjust the schedule or location.",
      });
    }

    // Handle image upload
    let uploadedImage = "";
    if (req.files && req.files.image) {
      const file = req.files.image;
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "Eventra",
        use_filename: true,
      });
      uploadedImage = result.secure_url;
    }

    // Parse tickets properly
    let parsedTickets;
    try {
      parsedTickets =
        typeof tickets === "string" ? JSON.parse(tickets) : tickets;
    } catch (err) {
      return res
        .status(400)
        .json({ message: "Invalid tickets format. Must be JSON." });
    }

    // Validate ticket array
    if (!Array.isArray(parsedTickets) || parsedTickets.length === 0) {
      return res.status(400).json({
        message: "At least one ticket (Regular, VIP, VVIP) is required.",
      });
    }

    // Validate allowed ticket names
    const allowedNames = ["Regular", "VIP", "VVIP"];
    for (const ticket of parsedTickets) {
      if (!allowedNames.includes(ticket.name)) {
        return res
          .status(400)
          .json({ message: `Invalid ticket name: ${ticket.name}` });
      }
    }

    // Normalize ticket data
    for (const ticket of parsedTickets) {
      if (ticket.type === "free") {
        ticket.price = 0;
      }
    }

    // Create event
    const newEvent = new EVENTS({
      title,
      description,
      category,
      capacity,
      perks,
      startDate,
      endDate,
      startTime, // Already in 24-hour format
      endTime, // Already in 24-hour format
      address,
      image: uploadedImage,
      tickets: parsedTickets,
      status: status || "draft",
      createdBy: req.user._id,
    });

    try {
      await newEvent.save();
      res.status(201).json({
        success: true,
        message: "Event created successfully",
        event: newEvent,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message:
            "An event with the same title, address, date, and time already exists.",
        });
      }

      console.log("Error creating event:", error);
      res.status(500).json({ message: error.message });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// getAll events
const getAllEvents = async (req, res) => {
  try {
    const allevents = await EVENTS.find();

    if (!allevents || allevents.length === 0) {
      return res.status(404).json({ message: "No events found" });
    }
    res.status(200).json({ success: true, count: allevents.length, allevents });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// get single event
// get single event by ID
const getSingleEvent = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid event ID" });
    }

    const event = await EVENTS.findById(id)
      .populate("createdBy", "firstname lastname  role")
      .populate("updatedBy", "firstname lastname  role");

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    res.status(200).json({ success: true, event });
  } catch (error) {
    console.error("Error fetching single event:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update events
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    let updates = req.body;

    // Only admins or superAdmins can update
    if (!["admin", "superAdmin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only admins can update events.",
      });
    }

    // Find the existing event
    const event = await EVENTS.findById(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Convert times to 24-hour format if provided
    if (updates.startTime) {
      updates.startTime = parseFlexibleTimeTo24(updates.startTime);
      if (!updates.startTime) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid start time format. Use HH:MM or HH:MM AM/PM format.",
        });
      }
    }

    if (updates.endTime) {
      updates.endTime = parseFlexibleTimeTo24(updates.endTime);
      if (!updates.endTime) {
        return res.status(400).json({
          success: false,
          message: "Invalid end time format. Use HH:MM or HH:MM AM/PM format.",
        });
      }
    }

    // Get final values (use updates if provided, otherwise keep existing)
    const finalStartDate = updates.startDate
      ? new Date(updates.startDate)
      : event.startDate;
    const finalEndDate = updates.endDate
      ? new Date(updates.endDate)
      : event.endDate;
    const finalStartTime = updates.startTime || event.startTime;
    const finalEndTime = updates.endTime || event.endTime;

    const now = new Date();

    // Combine date and time for accurate validation
    const eventStartDateTime = combineDateAndTime(
      finalStartDate,
      finalStartTime
    );
    const eventEndDateTime = combineDateAndTime(finalEndDate, finalEndTime);

    // 1. Validate start date/time is not in the past
    if (eventStartDateTime < now) {
      return res.status(400).json({
        success: false,
        message: "Event start date and time cannot be in the past.",
      });
    }

    // 2. Validate end date/time is after start date/time
    if (eventEndDateTime <= eventStartDateTime) {
      return res.status(400).json({
        success: false,
        message: "Event end date and time must be after start date and time.",
      });
    }

    // Handle new image upload (if provided)
    if (req.files && req.files.image) {
      const file = req.files.image;
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "Eventra",
        use_filename: true,
      });
      updates.image = result.secure_url;
    }

    // Parse tickets properly
    if (updates.tickets) {
      try {
        updates.tickets =
          typeof updates.tickets === "string"
            ? JSON.parse(updates.tickets)
            : updates.tickets;
      } catch (err) {
        return res
          .status(400)
          .json({ message: "Invalid tickets format. Must be JSON." });
      }

      // Validate allowed ticket names
      const allowedNames = ["Regular", "VIP", "VVIP"];
      for (const ticket of updates.tickets) {
        if (!allowedNames.includes(ticket.name)) {
          return res.status(400).json({
            message: `Invalid ticket name: ${ticket.name}`,
          });
        }
        if (ticket.type === "free") {
          ticket.price = 0; // Enforce free ticket pricing
        }
      }
    }

    // Duplicate check (exclude current event)
    if (updates.address || updates.startDate || updates.startTime) {
      const duplicateEvent = await EVENTS.findOne({
        _id: { $ne: id },
        address: updates.address || event.address,
        startDate: updates.startDate || event.startDate,
        startTime: updates.startTime || event.startTime,
      });

      if (duplicateEvent) {
        return res.status(400).json({
          success: false,
          message:
            "Another event with the same venue, date, and start time already exists.",
        });
      }
    }

    // Add updatedBy before saving
    updates.updatedBy = req.user._id;

    // Apply updates
    Object.assign(event, updates);
    await event.save();

    const populatedEvent = await EVENTS.findById(id)
      .populate("createdBy", "firstname lastname role")
      .populate("updatedBy", "firstname lastname role");

    res.status(200).json({
      success: true,
      message: "Event updated successfully",
      event: populatedEvent,
    });
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteEvent = async (req, res, next) => {
  try {
    // Ensure event ID is provided
    if (!req.params.id)
      return res.status(400).json({
        success: false,
        message: "Event id is required.",
      });

    //  Only admins or superAdmins can update
    if ("superAdmin" !== req.user.role) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only admins can delete events.",
      });
    }

    // Permanently delete event
    const event = await EVENTS.findByIdAndDelete(req.params.id);

    if (!event)
      return res.status(404).json({
        success: false,
        message: "Event not found!",
      });

    res
      .status(200)
      .json({ success: true, message: "Event deleted successfully." });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEvents,
  getAllEvents,
  getSingleEvent,
  updateEvent,
  deleteEvent,
};
