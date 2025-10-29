const mongoose = require("mongoose");
const {
  combineDateAndTime,
  parseFlexibleTimeTo24,
  formatTimeToAmPm,
} = require("../helpers/combineDateandTime");

const TicketSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: ["Regular", "VIP", "VVIP"],
      required: true,
    },
    type: {
      type: String,
      enum: ["paid", "free"],
      default: "paid",
    },
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ["Available", "Sold-out"],
      default: "Available",
    },
    price: {
      type: Number,
      default: 0,
      min: [0, "Price cannot be negative"],
    },
    quantityAvailable: {
      type: Number,
      default: 0,
      min: [0, "Quantity cannot be negative"],
    },
    maxPerOrder: {
      type: Number,
      default: 1,
      min: [1, "Max per order must be at least 1"],
    },
  },
  { _id: true }
);

const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    category: {
      type: String,
      enum: [
        "business",
        "sports",
        "festivals",
        "food-&-drinks",
        "dating",
        "hobbies",
      ],
    },
    capacity: { type: Number },
    perks: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    startTime: {
      type: String,
      required: true,
      set: parseFlexibleTimeTo24,
      get: formatTimeToAmPm,
    },
    endTime: {
      type: String,
      required: true,
      set: parseFlexibleTimeTo24,
      get: formatTimeToAmPm,
    },
    address: { type: String, required: true },
    image: {
      type: String,
    },
    tickets: [TicketSchema],
    status: { type: String, enum: ["draft", "live"], default: "draft" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

//  Prevent duplicates: same title, address, date & time
EventSchema.index(
  {
    title: 1,
    address: 1,
    startDate: 1,
    endDate: 1,
    startTime: 1,
    endTime: 1,
  },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

// Validate dates, times, and ticket prices before saving
EventSchema.pre("save", function (next) {
  const now = new Date();

  // ===== EVENT DATE/TIME VALIDATION =====

  // Combine date and time for accurate comparison
  const eventStartDateTime = combineDateAndTime(this.startDate, this.startTime);
  const eventEndDateTime = combineDateAndTime(this.endDate, this.endTime);

  // Disallow start date/time in the past
  if (eventStartDateTime < now) {
    return next(new Error("Event start date and time cannot be in the past."));
  }

  // Disallow end date/time before start date/time
  if (eventEndDateTime <= eventStartDateTime) {
    return next(
      new Error("Event end date and time must be after start date and time.")
    );
  }

  // ===== TICKET PRICE VALIDATION ======

  if (this.tickets && this.tickets.length > 0) {
    // Validate free tickets have price = 0
    for (const ticket of this.tickets) {
      if (ticket.type === "free" && ticket.price !== 0) {
        return next(
          new Error(
            `Ticket "${ticket.name}" is marked as free but has a non-zero price.`
          )
        );
      }
    }

    // Extract prices for each ticket type (only for paid tickets)
    const regularTicket = this.tickets.find(
      (t) => t.name === "Regular" && t.type === "paid"
    );
    const vipTicket = this.tickets.find(
      (t) => t.name === "VIP" && t.type === "paid"
    );
    const vvipTicket = this.tickets.find(
      (t) => t.name === "VVIP" && t.type === "paid"
    );

    // Price Hierarchy: Regular ≤ VIP ≤ VVIP

    // Regular price cannot be higher than VIP
    if (regularTicket && vipTicket && regularTicket.price > vipTicket.price) {
      return next(
        new Error(
          `Regular ticket price (${regularTicket.price}) cannot be higher than VIP ticket price (${vipTicket.price}).`
        )
      );
    }

    // Regular price cannot be higher than VVIP
    if (regularTicket && vvipTicket && regularTicket.price > vvipTicket.price) {
      return next(
        new Error(
          `Regular ticket price (${regularTicket.price}) cannot be higher than VVIP ticket price (${vvipTicket.price}).`
        )
      );
    }

    // VIP price cannot be higher than VVIP
    if (vipTicket && vvipTicket && vipTicket.price > vvipTicket.price) {
      return next(
        new Error(
          `VIP ticket price (${vipTicket.price}) cannot be higher than VVIP ticket price (${vvipTicket.price}).`
        )
      );
    }
  }

  next();
});

const EVENTS = mongoose.model("Eventra", EventSchema);

module.exports = EVENTS;
