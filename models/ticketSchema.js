const mongoose = require("mongoose");

//  Ticket schema
const TicketSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Events",
      required: [true, "Please provide the event ID."],
    },

    name: {
      type: String,
      required: [true, "Ticket name is required"],
      trim: true,
    },

    price: {
      type: Number,
      required: [true, "Please enter ticket price"],
      min: [0, "Price cannot be negative"],
    },

    type: {
      type: String,
      enum: {
        values: ["free", "paid"],
        message: "Ticket type must be either free or paid",
      },
      required: [true, "Select ticket type"],
      default: "free",
    },

    maxOrder: {
      type: Number,
      required: [true, "Maximum tickets per order is required"],
      min: [1, "Maximum order must be at least 1"],
      default: 1,
    },
    quantity: {
      type: Number,
      required: [true, "Ticket available quantity is required"],
      min: [0, "Quantity cannot be negative"],
      default: 0,
    },

    status: {
      type: String,
      enum: {
        values: ["available", "sold out"],
        message: "Status must be either available or sold out",
      },
      default: "available",
      required: [true, "Ticket status is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Instance method to check availability
TicketSchema.methods.isAvailable = function () {
  return this.status === "available" && this.quantity > 0;
};

const Ticket = mongoose.model("TicketMain", TicketSchema);
module.exports = Ticket;
