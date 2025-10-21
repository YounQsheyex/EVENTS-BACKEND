const { default: mongoose } = require("mongoose");

/*--------------------------------------------------
--------- DEMO EVENT TICKET TYPES SCHEMA -----------
----------------------------------------------------

const eventTicketTypes = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Regular", "VIP", "VVIP"],
    required: [true, "Event Ticket type is required."],
  },
  price: {
    type: Number,
    required: [true, "Event price is required."],
    min: 0,
  },
});

------------------------------------------------------
------------------------------------------------------
*/

// Define the Event schema
const eventSchema = new mongoose.Schema(
  {
    // Event title
    title: {
      type: String,
      minlength: [5, "Event title must be at least 5 characters."],
      maxlength: [100, "Event title cannot exceed 100 characters."],
    },

    // Event description
    description: {
      type: String,
      minlength: [10, "Event description must be at least 10 characters."],
      maxlength: [500, "Event description cannot exceed 500 characters."],
    },

    highlight: {
      type: String,
      minlength: [5, "Event highlight must be at least 5 characters."],
    },

    // Location of the event
    location: {
      type: String,
    },

    // Event date
    eventDate: Date,

    // Event start time
    eventStart: Date,

    // Event end time
    eventEnd: {
      type: Date,
      validate: {
        validator: function (value) {
          return value >= this.eventStart;
        },
        message: "End time must be after start time.",
      },
    },

    // Event price - must be >= 0
    price: {
      type: Number,
      min: 0,
    },

    // Image representing the event
    eventImage: {
      type: String,
    },

    // Event category - must be one of the given values
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

    availableSeats: {
      type: Number,
      min: [0, "Available seats cannot be negative"],
    },

    maxCapacity: {
      type: Number,
      min: [2, "Event capacity must be at least 2"],
    },

    // Event status - defaults to "upcoming"
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed", "cancelled"],
      default: "upcoming",
    },

    // collect ticket types in an array of objectIds referencing the Ticket model
    ticketTypes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ticket",
      },
    ],

    coordinates: {
      type: Array,
      default: [6.4716092, 3.0684469],
    },

    isDraft: {
      type: String,
      enum: ["draft", "live"],
      default: "draft",
    },

    perks: [
      {
        type: String,
      },
    ],
  },
  {
    // Add createdAt & updatedAt timestamps
    timestamps: true,

    // Customize JSON output when sending responses
    toJSON: {
      virtuals: true, //include virtual fields
      transform: function (doc, ret) {
        // Keep raw Date values (useful for frontend logic & sorting)
        const rawEventDate = ret.eventDate;
        const rawEventStart = ret.eventStart;
        const rawEventEnd = ret.eventEnd;

        // Add formatted strings alongside raw values
        if (rawEventDate) {
          ret.eventDateFormatted = rawEventDate.toLocaleString("en-US", {
            dateStyle: "medium",
          }); // --> E.g: "Sep 21, 2025"
        }

        if (rawEventStart) {
          ret.eventStartFormatted = rawEventStart.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "numeric",
            hour12: true,
          }); // --> E.g:'3:15 PM'
        }

        if (rawEventEnd) {
          ret.eventEndFormatted = rawEventEnd.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "numeric",
            hour12: true,
          });
        }

        // Remove `__v` (mongoose version key)
        delete ret.__v;
      },
    },
  }
);

// Compound index: ensures no two events share the same location, date, and start time
eventSchema.index(
  { location: 1, eventDate: 1, eventStart: 1 },
  { unique: true }
);

// Compile model from schema
const EVENTS = mongoose.model("Events", eventSchema);

module.exports = EVENTS;
