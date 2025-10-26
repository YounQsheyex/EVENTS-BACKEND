const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Eventra" // ⬅️ FIX: Use the correct Event model name
    },
    email:{
        type:String,
        required:true  
    },
    firstname:{
        type:String,
        required:true
    },
    lastname:{
        type:String,
        required:true
    },
    ticket: { 
        // ⬅️ CRITICAL FIX: The ID references an EMBEDDED subdocument. Remove 'ref'.
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    ticketInstances: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "TicketInstance", 
    }],
    quantity:{
        type:Number,
        required:true,
        default:1
    },
    reference: {
        type: String,
        unique: true,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ["pending","processing", "success", "failed"],
        default: "pending",
    },
    paidAt: Date,
    gatewayResponse: Object,
}, { timestamps: true });

const PAYMENT = mongoose.model("ticketPayment", paymentSchema);
module.exports = PAYMENT;