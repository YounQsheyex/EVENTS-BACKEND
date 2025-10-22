const express = require("express");
const mongoose = require("mongoose")
const EVENTS = require("../models/eventSchema.js");
const Ticket = require("../models/ticketSchema.js");

// Create different types of tickets for a single event
const handleCreateTicket = async (req, res, next) => {
  const { name, type, quantity, maxOrder, price, status } = req.body;
  const { eventId } = req.params;

  // --- 1. Core Input Validation & Parsing ---
  if (!name || !eventId || !type || !quantity || !price || !maxOrder) {
    return res.status(400).json({
      success: false,
      message:
        "Please provide all necessary fields: name, type, quantity, maxOrder, price, and status",
    });
  }
  
  // Parse required numeric inputs and set status default
  const requestedQuantity = parseInt(quantity, 10);
  const ticketStatus = status || "available";

  if (isNaN(requestedQuantity) || requestedQuantity <= 0) {
      return res.status(400).json({
          success: false,
          message: "Quantity must be a positive number.",
      });
  }

  // Validate ticket type matches price
  if (type === "free" && price > 0) {
    return res.status(400).json({
      success: false,
      message: "Free tickets cannot have a price greater than 0",
    });
  }

  if (type === "paid" && price <= 0) {
    return res.status(400).json({
      success: false,
      message: "Paid tickets must have a price greater than 0",
    });
  }

  try {
    // Check if event exists and get capacity (Using 'capacity' field for consistency)
        const event = await EVENTS.findById(eventId).select('maxCapacity availableSeats');
    
    if (!event) {
        return res.status(404).json({
            success: false,
            message: "Event not found. Cannot create tickets for non-existent event.",
        });
    }
    
    // FIX: Determine which capacity field exists
    const eventCapacity = event.maxCapacity;
    
    if (!eventCapacity || eventCapacity <= 0) {
        return res.status(400).json({
            success: false,
            message: "Event capacity is not set or invalid.",
        });
    }
    
    console.log("Event Capacity:", eventCapacity);
    console.log("Requested Quantity:", requestedQuantity);
         
    // --- 3. FIXED Capacity Check Logic ---
    // Find the sum of quantities of ALL existing tickets for this event
    const existingTicketsAggregate = await Ticket.aggregate([
        { $match: { event: new mongoose.Types.ObjectId(eventId) } },
        { $group: { _id: null, totalTickets: { $sum: "$quantity" } } }
    ]);

    const currentTotalTickets = existingTicketsAggregate.length > 0 
        ? existingTicketsAggregate[0].totalTickets 
        : 0;
    
    const potentialTotalTickets = currentTotalTickets + requestedQuantity;

    console.log("Current Total Tickets:", currentTotalTickets);
    console.log("Potential Total Tickets:", potentialTotalTickets);

    // FIX: Compare potential total with event capacity
    if (potentialTotalTickets > eventCapacity) {
        return res.status(400).json({
            success: false,
            message: `Cannot create ticket. The requested quantity (${requestedQuantity}) would exceed the event capacity.`,
            details: {
                requestedQuantity: requestedQuantity,
                currentTotalTickets: currentTotalTickets,
                potentialTotalTickets: potentialTotalTickets,
                eventCapacity: eventCapacity,
                remainingCapacity: eventCapacity - currentTotalTickets
            }
        });
    }



       // Create ticket
    const ticket = await Ticket.create({
      name,
      type,
      quantity: requestedQuantity, // Use the parsed integer value
      maxOrder,
      price,
      status: ticketStatus, // Use the resolved status
      event: eventId,
    });

    return res.status(201).json({
      success: true,
      message: "Ticket created successfully.",
      data: ticket,
    });
  } catch (error) {
    // Handle duplicate ticket name for the same event via the MongoDB unique index error
    console.error("MongoDB Error on Ticket Creation:", error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A ticket with this name already exists for this event. Please use a different name or update the existing ticket.",
      });
    }

    next(error);
  }
};

// to update ticket details
const handleUpdateTicket = async (req, res, next) => {
  const { ticketId } = req.params;
  const { price, quantity, maxOrder, status, name, type } = req.body; // Build update object with only provided fields

  const updateFields = {};
  if (price !== undefined) updateFields.price = price;
  if (quantity !== undefined) updateFields.quantity = quantity;
  if (maxOrder !== undefined) updateFields.maxOrder = maxOrder;
  if (status !== undefined) updateFields.status = status;
  if (name !== undefined) updateFields.name = name;
  if (type !== undefined) updateFields.type = type; // Check if at least one field is provided

  if (Object.keys(updateFields).length === 0) {
    return res.status(400).json({
      success: false,
      message:
        "Please provide at least one field to update (price, quantity, maxOrder, status, or name).",
    });
  }

  try {
    // Correctly using the retrieved Model (Ticket)
    const updated = await Ticket.findByIdAndUpdate(ticketId, updateFields, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Ticket does not exist",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Ticket updated successfully.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// to get all ticket partaining to a particular event
const handleGetAllTicket = async (req, res, next) => {
  const { eventId } = req.params;

  try {
    // Correctly using the retrieved Model (Ticket)
    const allTicket = await Ticket.find({ event: eventId }).populate(
      "event",
      "title eventDate"
    );

    if (!allTicket || allTicket.length === 0) {
      return res
        .status(404)
        .json({
          success: false,
          message: "there are currently no available ticket",
        });
    }

    res.status(200).json({
      success: true,
      message: `available tickets to ${eventId}`,
      allTicket,
    });
  } catch (error) {
    next(error);
  }
};

const handleDeleteTicket = async (req, res, next) => {
  const { ticketId } = req.params;

  if (!ticketId) {
    return res.status(400).json({
      success: false,
      message: "Ticket ID is required",
    });
  }

  try {
    // const paymentSchema = require("../models/paymentSchema");
    // const hasPayments = await paymentSchema.findOne({
    //   ticket: ticketId,
    //   status: "success"
    // });

    // if (hasPayments) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Cannot delete ticket with existing successful payments. Consider marking it as unavailable instead."
    //   });
    // }

    // Correctly using the retrieved Model (Ticket)
    const deleted = await Ticket.findByIdAndDelete(ticketId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Ticket deleted successfully.",
      data: deleted,
    });
  } catch (error) {
    next(error);
  }
};

// ⚠️ WARNING: This deletes ALL tickets for this event
// Add as temporary endpoint for testing:

const handleClearEventTickets = async (req, res) => {
  const { eventId } = req.params;

  const result = await Ticket.deleteMany({ event: eventId });

  res.json({
    success: true,
    message: `Deleted ${result.deletedCount} tickets`,
  });
};

module.exports = {
  handleCreateTicket,
  handleUpdateTicket,
  handleDeleteTicket,
  handleGetAllTicket,
  handleClearEventTickets,
};
