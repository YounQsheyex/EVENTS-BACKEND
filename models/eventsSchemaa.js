const mongoose = require("mongoose");

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
  startTime: { type: String, required: true }, // Example: "18:00" (6 PM)
  endTime: { type: String, required: true },
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
