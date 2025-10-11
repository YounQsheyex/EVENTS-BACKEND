const mongoose = require("mongoose")

const paymentSchema = new mongoose.Schema({
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    //   required: true,
    },
    firstname:{
      type:String,
      required:true
    },
    lastname:{
      type:String,
      required:true
    },
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ticket",
      required: true,
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
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    paidAt: Date,
    gatewayResponse: Object,
}, { timestamps: true })

module.exports = mongoose.model("ticketPayment", paymentSchema)