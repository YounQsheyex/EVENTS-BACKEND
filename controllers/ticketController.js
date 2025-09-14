// ticketController.js
const Ticket = require("../models/ticketSchema.js");
const Event = require("../models/eventSchema.js");

/**
 * Controller: purchaseTicket
 * Handles ticket purchase by:
 * 1. Validating request data
 * 2. Checking event status & ticket category
 * 3. Atomically decrementing available seats
 * 4. Creating and returning the purchased ticket
 */
const purchaseTicket = async (req, res, next) => {
  try {
    const { ticketType, price, userId, eventId } = req.body;

    // ✅ Step 1: Validate required fields
    if (!eventId || !userId || !ticketType || !price) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // (Optional) When User model exists, verify that userId is valid
    /*
    const isUser = await User.findById(userId);
    if (!isUser) {
      return res.status(404).json({ success: false, message: "User not found!" });
    }
    */

    // ✅ Step 2: Fetch event details
    const event = await Event.findById(eventId);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    // ✅ Step 3: Validate event status
    if (event.status === "cancelled") {
      return res
        .status(409)
        .json({ success: false, message: "This event has been cancelled." });
    }

    if (
      event.status === "ended" &&
      new Date(event.eventEnd).getTime() < Date.now()
    ) {
      return res.status(409).json({
        success: false,
        message: `This event ended on ${event.eventEnd}.`,
      });
    }

    if (event.status === "ongoing") {
      return res.status(409).json({
        success: false,
        message: "You cannot purchase tickets for an ongoing event.",
      });
    }

    // ✅ Step 4: Validate ticket category (type + price must match)
    const validCategory = event.ticketCategories.find(
      (ticketCategory) =>
        ticketCategory.name === ticketType && ticketCategory.price === price
    );

    if (!validCategory) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket type or inappropriate price.",
      });
    }

    // ✅ Step 5: Atomically decrement seat count (ensures no overselling)
    const updatedEvent = await Event.findOneAndUpdate(
      { _id: eventId, remainingSeats: { $gte: 1 } }, // only update if seats remain
      { $inc: { remainingSeats: -1 } }, // decrement by 1
      { new: true } // return updated event doc
    );

    if (!updatedEvent) {
      return res.status(409).json({ success: false, message: "No seats left" });
    }

    // ✅ Step 6: Create the ticket
    const ticket = await Ticket.create({
      event: eventId,
      user: userId,
      ticketType,
      price,
    });

    // ✅ Step 7: Respond with success
    return res.status(201).json({
      success: true,
      message: "Ticket purchased successfully",
      ticket,
    });
  } catch (error) {
    next(error); // pass to errorMiddleware
  }
};

/**
 * Controller: deleteTicket
 * Handles ticket deletion by:
 * 1. Checking if ticket exists
 * 2. Ensuring only admin or ticket owner can delete
 * 3. Incrementing remainingSeats (returning seat back to pool)
 * 4. Deleting the ticket
 */
const deleteTicket = async (req, res, next) => {
  try {
    const user = req.user; // comes from authMiddleware

    // ✅ Step 1: Find ticket by ticketCode
    const ticket = await Ticket.findOne({ ticketCode: req.params.id });

    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    // ✅ Step 2: Ensure only owner or admin can delete
    if (
      user.role !== "admin" &&
      ticket.user.toString() !== user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Only the ticket owner or an admin can delete this ticket.",
      });
    }

    // ✅ Step 3: Return seat to the event
    await Event.findOneAndUpdate(
      { _id: ticket.event },
      { $inc: { remainingSeats: 1 } }, // increment by 1 on deletion
      { new: true }
    );

    // ✅ Step 4: Delete ticket
    await ticket.deleteOne();

    return res
      .status(200)
      .json({ success: true, message: "Ticket deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = { purchaseTicket, deleteTicket };
