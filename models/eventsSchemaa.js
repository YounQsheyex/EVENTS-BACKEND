const mongoose = require("mongoose");

const formatTimeToAmPm = (time) => {
  if (!time) return "";
  const [hourStr, minute] = time.split(":");
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12; // 0 becomes 12
  return `${hour}:${minute} ${ampm}`;
};

// Helper: convert "hh:mm AM/PM" → 24-hour "HH:mm"
const parseAmPmTo24 = (timeStr) => {
  if (!timeStr) return "";
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":");
  hours = parseInt(hours, 10);
  if (modifier.toUpperCase() === "PM" && hours < 12) hours += 12;
  if (modifier.toUpperCase() === "AM" && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, "0")}:${minutes}`;
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

const EventSchema = new mongoose.Schema({
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
    set: parseAmPmTo24, // converts “2:00 PM” → “14:00” when saving
    get: formatTimeToAmPm, // converts “14:00” → “2:00 PM” when reading
  },
  endTime: {
    type: String,
    required: true,
    set: parseAmPmTo24,
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
    ref: "users", //  matches your USER model name
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

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

const EVENTS = mongoose.model("Eventra", EventSchema);

module.exports = EVENTS;
