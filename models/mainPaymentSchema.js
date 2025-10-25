const mongoose = require("mongoose")

const paymentSchema = new mongoose.Schema({
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Eventra"
    },
    ticket:{
        type:String,
        required:true
    },
    ticketInstances: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "TicketInstance", 
    }],
    firstname:{
      type:String,
      required:true
    },
    lastname:{
      type:String,
      required:true
    },
    
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
      enum: ["pending","processing", "success", "failed", "amount_mismatch","inventory_error"],
      default: "pending",
    },
    paidAt: Date,
    gatewayResponse: Object,
}, { timestamps: true })

const PAYMENT = mongoose.model("mainTicketPayment", paymentSchema)
 module.exports = PAYMENT