
const express = require("express");
const TicketSchema = require("../models/ticketSchema");
const ticketSchema = require("../models/ticketSchema");

// create different type of ticket for a single event
// getting the event id from the url
const handleCreateTicket = async (req, res, next) => {
   const {
    name,
    type,
    quantity,
    maxOrder,
    price,
    status
  } = req.body;;
  const  eventId = req.params.eventId

  if (!name 
    || !type
    || !quantity
    || !eventId
    || !price
    || !maxOrder
    || !status ) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide all necessery fields" });
  }

  try {
   const ticket = await ticketSchema.create({
    name,
    type,
    quantity,
    maxOrder,
    price,
    status,
    event:eventId
   })

    // response
    return res.status(201).json({
      success: true,
      message: "Tickets created successfully.",
      //  eventId:eventId,
      data: {
        ticket
      },
    });
  } catch (error) {
     if (error.code === 11000) {
        return res.status(409).json({
            success: false,
            message: "Ticket types already exist for this event. Please use an update route instead.",
        })
      }
    next(error);
  }
};


// to update ticket details
const handleUpdateTicket = async (req, res, next) => {
  const { ticketId } = req.params;
  const { price, quantity, maxOrder, status, name, type } = req.body;

  // Build update object with only provided fields
  const updateFields = {};
  if (price !== undefined) updateFields.price = price;
  if (quantity !== undefined) updateFields.quantity = quantity;
  if (maxOrder !== undefined) updateFields.maxOrder = maxOrder;
  if (status !== undefined) updateFields.status = status;
  if (name !== undefined) updateFields.name = name;
  if (type !== undefined) updateFields.type = type;

  // Check if at least one field is provided
  if (Object.keys(updateFields).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please provide at least one field to update (price, quantity, maxOrder, status, or name)."
    });
  }

  try {
    const updated = await TicketSchema.findByIdAndUpdate(
      ticketId,
      updateFields,
      { new: true, runValidators: true }
    );
    
    if (!updated) {
      return res.status(404).json({
        success: false, 
        message: "Ticket does not exist"
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
const handleGetAllTicket = async (req,res,next)=>{
  const {eventId} = req.params

  try {
    const allTicket = await TicketSchema.find({eventId})

    if(!allTicket){
      return  res.status(404).json({success:false, message:"there are currently no available ticket"})
    }

    res.status(200).json({
        success:true,
        message:`available tickets to ${eventId}`,
         allTicket})
  } catch (error) {
    next(error)
  }
}


const handleDeleteTicket = async (req, res, next) => {
  const { ticketId } = req.params;

  if (!ticketId) {
    return res.status(400).json({
      success: false,
      message: "Ticket ID is required"
    });
  }

  try {
    // const paymentSchema = require("../models/paymentSchema");
    // const hasPayments = await paymentSchema.findOne({ 
    //   ticket: ticketId,
    //   status: "success" 
    // });

    // if (hasPayments) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Cannot delete ticket with existing successful payments. Consider marking it as unavailable instead."
    //   });
    // }

    const deleted = await ticketSchema.findByIdAndDelete(ticketId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Ticket deleted successfully.",
      data: deleted
    });
  } catch (error) {
    next(error);
  }
};


module.exports = { handleCreateTicket,
  handleUpdateTicket,
  handleDeleteTicket,
  handleGetAllTicket };