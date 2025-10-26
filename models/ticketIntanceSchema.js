const mongoose = require("mongoose");

const ticketInstanceSchema = new mongoose.Schema(
  {
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ticketPayment",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    ticketType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TicketMain",
      required: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Events",
      required: [true, "Please provide the event ID."],
    },
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
    },
    ticketToken: {
      type: String,
      required: true,
      unique: true,
    },
    attendeeName: {
      type: String,
      default: "",
    },
    attendeeEmail: {
      type: String,
      default: "",
    },
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
    //     eventName: String,
    //     eventDate: Date,
    //     eventLocation: String,
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

ticketInstanceSchema.index({ user: 1, status: 1 }); // KEEP: This is a useful compound index

module.exports = mongoose.model("TicketInstance", ticketInstanceSchema);
