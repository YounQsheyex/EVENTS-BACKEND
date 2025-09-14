// ============================
// Event Schema for Eventra
// ============================

// Import Mongoose tools
const { Schema, model } = require("mongoose");

// ============================
// Ticket Type (Subdocument)
// ============================
// This sub-schema defines ticket categories for an event.
// It is embedded directly inside the Event schema.
const ticketTypeSchema = new Schema({
  // Name of the ticket category (e.g., "VIP", "VVIP", "Regular")
  name: { type: String, required: true, trim: true, default: "Regular" },

  // Ticket price: must be >= 0
  price: { type: Number, required: true, min: 0, default: 0 },

  // How many tickets are available in this category
  quantity: { type: Number, required: true, min: 1, default: 2 },
});

// ============================
// Event Schema Definition
// ============================
// Represents events created on Eventra.
// MongoDB collection: "events"
const eventSchema = new Schema(
  {
    // Title of the event (must be unique & at least 5 chars)
    title: {
      type: String,
      required: true,
      trim: true,
      minLength: 5,
      unique: true,
    },

    // Optional event description
    description: { type: String, trim: true },

    // Location of the event (must be unique & at least 3 chars)
    location: {
      type: String,
      required: true,
      trim: true,
      minLength: 3,
      unique: true,
    },

    // URL of the cover/banner image
    coverImage: { type: String },

    // Event start date/time (ISO string e.g., "2025-09-21T09:00:00Z")
    eventStart: {
      type: String,
      required: [true, "Event start is required."],
      unique: true,
    },

    // Event end date/time (ISO string)
    eventEnd: {
      type: String,
      required: [true, "Event end is required."],
      validate: {
        // Must always be >= eventStart
        validator: function (value) {
          if (!this.eventStart) return true; // skip if start not set yet
          const start = new Date(this.eventStart);
          const end = new Date(value);
          return !isNaN(start) && !isNaN(end) && end >= start;
        },
        message: "Event end date must be after the start date.",
      },
    },

    // Array of ticket types (VIP, Regular, etc.)
    ticketCategories: [ticketTypeSchema],

    // Reference to actual purchased tickets (separate collection)
    tickets: [{ type: Schema.Types.ObjectId, ref: "Ticket" }],

    // Currency for ticket sales
    currency: { type: String, enum: ["USD", "NGN"], default: "USD" },

    // Event category (restricted to enum values)
    category: {
      type: String,
      enum: [
        "sports",
        "business",
        "festivals",
        "food-&-drinks",
        "technology",
        "finance",
        "dating",
        "hobbies",
        "other",
      ],
      default: "other",
    },

    // Total number of seats available for the event
    totalSeats: {
      type: Number,
      required: true,
      min: 2,
      default: 2,
    },

    // Remaining available seats (auto-calculated)
    remainingSeats: {
      type: Number,
      required: true,
      validate: {
        validator: function (value) {
          return (
            typeof this.totalSeats === "number" &&
            value >= 0 &&
            value <= this.totalSeats
          );
        },
        message:
          "Remaining seats must be between 0 and the total number of seats.",
      },
    },

    // Current status of the event
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "ended", "cancelled"],
      default: "upcoming",
    },
  },
  {
    // Adds createdAt & updatedAt timestamps automatically
    timestamps: true,

    // Customize JSON response sent to frontend
    toJSON: {
      versionKey: false, // remove "__v"

      // Transform allows us to clean up the returned object
      transform: function (doc, ret) {
        ret.id = ret._id; // expose "id" instead of "_id"
        delete ret._id;
        return ret;
      },
    },
  }
);

// ============================
// Indexes (for performance)
// ============================
// Makes queries faster by category + start date
eventSchema.index({ category: 1, eventStart: 1 });

// ============================
// Middleware (Hooks)
// ============================

// Pre-save hook: initialize and validate seats
eventSchema.pre("save", function (next) {
  // Auto-set remainingSeats to totalSeats if new event
  if (
    this.isNew &&
    (this.remainingSeats === undefined || this.remainingSeats === null)
  ) {
    this.remainingSeats = this.totalSeats;
  }

  // Ensure remainingSeats never exceeds totalSeats
  if (this.remainingSeats > this.totalSeats) {
    this.remainingSeats = this.totalSeats;
  }

  next();
});

// Pre-save hook: normalize dates + update status
eventSchema.pre("save", function (next) {
  const now = new Date();

  // Convert eventStart & eventEnd into ISO strings
  this.eventStart = new Date(this.eventStart).toISOString();
  this.eventEnd = new Date(this.eventEnd).toISOString();

  const start = new Date(this.eventStart);
  const end = new Date(this.eventEnd);

  // If invalid dates, throw error
  if (isNaN(start) || isNaN(end)) {
    return next(new Error("Invalid eventStart or eventEnd format"));
  }

  // Update status dynamically
  if (end < now) {
    this.status = "ended";
  } else if (start <= now && end >= now) {
    this.status = "ongoing";
  } else {
    this.status = "upcoming";
  }

  // Double-check remainingSeats for new events
  if (this.isNew && !this.remainingSeats) {
    this.remainingSeats = this.totalSeats;
  }

  next();
});

// Pre-find hook: auto-sort events by start date
eventSchema.pre("find", function () {
  this.sort({ eventStart: 1 });
});

// ============================
// Model Export
// ============================
// Explicitly specify collection name: "events"
const Event = model("Event", eventSchema, "events");

module.exports = Event;
