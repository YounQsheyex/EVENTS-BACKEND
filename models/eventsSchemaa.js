const mongoose = require("mongoose");

//  Convert any flexible time input → 24-hour format ("HH:mm")
const parseFlexibleTimeTo24 = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string") return "";

  const cleaned = timeStr.trim().toUpperCase();

  //  Handle simple 24-hour input: "16:00" or "09:30"
  if (/^\d{1,2}:\d{2}$/.test(cleaned)) {
    const [hourStr, minute] = cleaned.split(":");
    const hour = parseInt(hourStr, 10);
    if (hour >= 0 && hour < 24) {
      return `${hour.toString().padStart(2, "0")}:${minute}`;
    }
  }

  //  Handle 12-hour input like "4:00PM", "04:30 am", "4:00 pm"
  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return ""; // Invalid format — safe fallback

  let [, hourStr, minute, modifier] = match;
  let hour = parseInt(hourStr, 10);

  if (modifier) {
    modifier = modifier.toUpperCase();
    if (modifier === "PM" && hour < 12) hour += 12;
    if (modifier === "AM" && hour === 12) hour = 0;
  }

  return `${hour.toString().padStart(2, "0")}:${minute}`;
};

// Convert 24-hour ("HH:mm") → 12-hour ("hh:mm AM/PM")
const formatTimeToAmPm = (time) => {
  if (!time || typeof time !== "string") return "";
  const [hourStr, minute] = time.split(":");
  let hour = parseInt(hourStr, 10);
  if (isNaN(hour)) return time;

  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
};

const TicketSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: ["Regular", "VIP", "VVIP"], // enforce ticket names
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
    },
    quantityAvailable: {
      type: Number,
      default: 0,
    },
    maxPerOrder: {
      type: Number,
      default: 1,
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
  { unique: true, collation: { locale: "en", strength: 2 } } // makes it case-insensitive ,
);

// Prevent creating events with past start or end dates
EventSchema.pre("save", function (next) {
  const now = new Date();

  // Disallow startDate before now
  if (this.startDate && this.startDate < now) {
    return next(new Error("Start date cannot be in the past."));
  }

  // Disallow endDate before startDate
  if (this.endDate && this.endDate < this.startDate) {
    return next(new Error("End date cannot be earlier than start date."));
  }

  next();
});


const EVENTS = mongoose.model("Eventra", EventSchema);

module.exports = EVENTS;
