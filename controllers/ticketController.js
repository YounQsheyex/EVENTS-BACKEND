
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
    // Create tickets using the single Ticket model with different type values
   const [regularTicket, vipTicket, vvipTicket] = await Promise.all([
      TicketSchema.create({ price: regularPrice, type: "regular", eventId }),
      TicketSchema.create({ price: vipPrice, type: "vip", eventId }),
      TicketSchema.create({ price: vvipPrice, type: "vvip", eventId })
    ])
   
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
 const {ticketId} = req.params
 const {price} = req.body

 if (!price) {
    return res.status(400).json({
      success: false,
      message: "Please provide a price to update."
    });
  }

 try {
    const updated = await TicketSchema.findByIdAndUpdate(ticketId,{price},
      { new: true, runValidators: true })
    
      if (!updated){
        return res.status(404).json({
            success:false, 
            message:"ticket does not exist"})
      }

       return res.status(200).json({
      success: true,
      message: "Ticket updated successfully.",
      data: updated,
    });
 } catch (error) {
    next(error)
 }
};

// to get all ticket partaining to a particular event
const getAllTicket = async (req,res,next)=>{
  const {eventId} = req.body

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

// const deleteTicket = async ()=>{
//     try {
        
//     } catch (error) {
        
//     }
// }

module.exports = { createTicket, updateTicket,getAllTicket };