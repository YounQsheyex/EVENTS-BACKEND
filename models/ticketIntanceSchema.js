const mongoose = require("mongoose");

const ticketInstanceSchema = new mongoose.Schema(
  {
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ticketPayment", // Use the correct PAYMENT model name
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    ticketType: {
      type: mongoose.Schema.Types.ObjectId, 
      required: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Eventra",
      required: [true, "Please provide the event ID."],
    },
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
    },
    // ... (rest of the fields are fine)
    status: {
      type: String,
      enum: ["valid", "used", "cancelled", "transferred"],
      default: "valid",
    },
    usedAt: {
      type: Date,
    },
    qrCode: {
      type: String,
      required: false,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

ticketInstanceSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model("TicketInstance", ticketInstanceSchema);