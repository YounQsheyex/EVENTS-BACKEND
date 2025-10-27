const mongoose = require("mongoose");

const ticketInstanceSchema = new mongoose.Schema(
  {
    // --- Core Relationships ---
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
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Eventra",
      required: [true, "Please provide the event ID."],
    },
    ticketType: {
      type: mongoose.Schema.Types.ObjectId, // ID of the embedded ticket subdocument
      required: true,
    },

    // --- Unique Ticket Identifiers (CRITICAL FIXES) ---
    ticketNumber: {
      type: String,
      required: true,
      unique: true, // ⬅️ MUST BE UNIQUE (Now fixed by the helper logic)
      index: true,  // For fast lookup
    },
    ticketToken: {
      type: String,
      required: true,
      unique: true, // ⬅️ MUST BE UNIQUE (for secure validation)
    },
    qrCode: {
      type: String, // Base64 Data URL string
      required: false,
    },

    // --- Attendee Data ---
    attendeeName: {
        type: String,
        required: true,
    },
    attendeeEmail: {
        type: String,
        required: true,
    },

    // --- Status and Usage Tracking ---
    status: {
      type: String,
      enum: ["valid", "used", "cancelled", "transferred"],
      default: "valid",
    },
    usedAt: {
      type: Date,
      default: null,
    },
    
    // --- Denormalized Metadata ---
    metadata: {
      type: Object, // Holds eventName, eventDate, price, orderReference, etc.
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// --- Compound Index for Fast User Ticket Listing and Status Filtering ---
ticketInstanceSchema.index({ user: 1, status: 1 });

// --- Additional Index for Event Check-in ---
ticketInstanceSchema.index({ event: 1, ticketNumber: 1 });


const TICKETINSTANCE = mongoose.model("TicketInstance", ticketInstanceSchema);
module.exports = TICKETINSTANCE