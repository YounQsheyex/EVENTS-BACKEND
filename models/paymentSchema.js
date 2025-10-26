const mongoose = require("mongoose")

const paymentSchema = new mongoose.Schema({
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Events"
    },
    // Removed the ambiguous 'purchasedTicketDetails' field.
    firstname:{
      type:String,
      required:true
    },
    lastname:{
      type:String,
      required:true
    },
    ticket: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: "TicketMain",
      required: true,
    },
    // ADDED: Array to hold references to the individual generated tickets
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
}, { timestamps: true })

module.exports = mongoose.model("ticketPayment", paymentSchema)