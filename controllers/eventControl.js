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
    // duplicate events
    // Normalize dates for comparison (ignore milliseconds/timezones)
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    // Find duplicate event
    // Normalize for comparison
    const normalizedTitle = title.trim();
    const normalizedAddress = address.trim();
    const normalizedStartTime = startTime.trim();
    const normalizedEndTime = endTime.trim();

    const normalizedStartDate = new Date(startDate);
    const normalizedEndDate = new Date(endDate);
    normalizedStartDate.setHours(0, 0, 0, 0);
    normalizedEndDate.setHours(0, 0, 0, 0);

    // ✅ Check duplicate with case-insensitive regex
    const duplicateEvent = await EVENTS.findOne({
      title: { $regex: new RegExp(`^${normalizedTitle}$`, "i") }, // case-insensitive
      address: { $regex: new RegExp(`^${normalizedAddress}$`, "i") }, // case-insensitive
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
      startTime: { $regex: new RegExp(`^${normalizedStartTime}$`, "i") }, // case-insensitive
      endTime: { $regex: new RegExp(`^${normalizedEndTime}$`, "i") }, // case-insensitive
    });

    if (duplicateEvent) {
      return res.status(400).json({
        success: false,
        message:
          "An event with the same title, address, date, and time already exists.",
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

    const event = await EVENTS.findById(id).populate(
      "createdBy",
      "firstname lastname email role"
    );

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

module.exports = { createEvents, getAllEvents, getSingleEvent };
