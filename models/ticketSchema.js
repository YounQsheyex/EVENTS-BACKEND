const express = require("express");
const mongoose = require("mongoose");

// Regular Ticket schema
const regularTicketSchema = new mongoose.Schema({
    price: {
        type: Number,
        required: true,
        unique: true,
    }
}, { timestamps: true });

// VIP Ticket schema
const vipTicketSchema = new mongoose.Schema({
    price: {
        type: Number,
        required: true,
        unique: true,
    }
}, { timestamps: true });

// VVIP Ticket schema
const vvipTicketSchema = new mongoose.Schema({
    price: {
        type: Number,
        required: true,
        unique: true,
    }
}, { timestamps: true });

// Create models
const RegularTicket = mongoose.model("RegularTicket", regularTicketSchema);
const VipTicket = mongoose.model("VipTicket", vipTicketSchema);
const VvipTicket = mongoose.model("VvipTicket", vvipTicketSchema);

// Export models
module.exports = { RegularTicket, VipTicket, VvipTicket };
