
const express = require("express");
const TicketSchema = require("../models/ticketSchema");

// create different type of ticket for a single event
const createTicket = async (req, res, next) => {
  const { regularPrice, vipPrice, vvipPrice, eventId } = req.body;

  if (!regularPrice || !vipPrice || !vvipPrice || !eventId) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide prices and eventId for all ticket types." });
  }

  try {
    // Create tickets using the single Ticket model with different 'type' values
    const regularTicket = await TicketSchema.create({
      price: regularPrice,
      type: "regular",
      eventId,
    });
    const vipTicket = await TicketSchema.create({
      price: vipPrice,
      type: "vip",
      eventId,
    });
    const vvipTicket = await TicketSchema.create({
      price: vvipPrice,
      type: "vvip",
      eventId,
    });
   
    // response
    return res.status(201).json({
      success: true,
      message: "Tickets created successfully.",
      data: {
        regularTicket,
        vipTicket,
        vvipTicket,
      },
    });
  } catch (error) {
    next(error);
  }
};

// to update ticket details
const updateTicket = async (req, res, next) => {
 const {id} = req.params
 const {price,type} = req.body

 try {
    const updated = await TicketSchema.findByIdAndUpdate({_id:id},{ price, type, eventId },
      { new: true, runValidators: true })
    
      if (!updated){
        res.status(404).json({success:false, message:"ticket does not exist"})
      }

       return res.status(200).json({
      success: true,
      message: "Ticket updated successfully.",
      data: updatedTicket,
    });
 } catch (error) {
    next(error)
 }
};

// to get all ticket to a particular event
const getAllTicket = async (req,res)=>{
    
}

module.exports = { createTicket, updateTicket };