// ticketSchema.js
const { Schema, model } = require("mongoose");

const ticketSchema = new Schema(
  {
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    ticketType: { type: String, required: true }, // e.g. "VIP", "VVIP", "Regular"
    price: { type: Number, required: true },
    ticketCode: { type: String, unique: true },
  },
  { timestamps: true }
);

// Pre-save hook: derive price from event.ticketCategories
ticketSchema.pre("save", async function (next) {
  try {
    const Event = model("Event");
    const event = await Event.findById(this.event);
    if (!event) return next(new Error("Event not found"));

    // Find matching ticket type inside the event
    const category = event.ticketCategories.find(
      (cat) => cat.name.toLowerCase() === this.ticketType.toLowerCase()
    );

    if (!category) return next(new Error("Invalid ticket type for this event"));

    // Assign the price from the event
    this.price = category.price;

    // Generate unique ticket code if not already set
    if (!this.ticketCode) {
      this.ticketCode =
        "TKT-" +
        Math.random().toString(36).substring(2, 8).toUpperCase() +
        "-" +
        Date.now().toString().slice(-5);
    }

    next();
  } catch (err) {
    next(err);
  }
});

const Ticket = model("Ticket", ticketSchema, "tickets");
module.exports = Ticket;
