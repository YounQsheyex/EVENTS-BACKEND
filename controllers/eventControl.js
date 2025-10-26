const EVENTS = require("../models/eventsSchemaa");
const cloudinary = require("cloudinary").v2;

// creating of events
const createEvents = async (req, res) => {
  const {
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
    if (!["admin", "superAdmin"].includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Access denied. Only admins can create events." });
    }

    //  Strict duplicate check — must match ALL three fields
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

    //  handle images upload
    let uploadedImage = "";
    if (req.files && req.files.image) {
      const file = req.files.image;
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "Eventra",
        use_filename: true,
      });
      uploadedImage = result.secure_url;
    }

    //  Parse tickets properly (in case sent as stringified JSON)
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
        ticket.price = 0; //  enforce free ticket price
      }
    }

    // create property on the db
    const newEvent = new EVENTS({
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
      image: uploadedImage,
      tickets: parsedTickets,
      status: status || "drafts",
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

// update events
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    //  Only admins or superAdmins can update
    if (!["admin", "superAdmin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only admins can update events.",
      });
    }

    //  Find the existing event
    const event = await EVENTS.findById(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    //  Handle new image upload (if provided)
    if (req.files && req.files.image) {
      const file = req.files.image;

      // Upload new image
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "Eventra",
        use_filename: true,
      });
      updates.image = result.secure_url;
    }

    //  Parse tickets properly
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

    //  Duplicate check (exclude current event)
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
    event.updatedBy = req.user._id;

    //  Apply updates
    Object.assign(event, updates);
    await event.save();

    const populatedEvent = await EVENTS.findById(id)
      .populate("createdBy", "firstname lastname  role")
      .populate("updatedBy", "firstname lastname  role");

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
