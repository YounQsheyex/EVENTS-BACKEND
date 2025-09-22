const { default: mongoose } = require("mongoose");

// Define the Event schema
const eventSchema = new mongoose.Schema(
  {
    // Event title
    title: {
      type: String,
      required: [true, "Event title is required."],
    },

    // Event description
    description: {
      type: String,
      required: [true, "Event description is required."],
    },

    // Location of the event
    location: {
      type: String,
      required: [true, "Event location is required."],
    },

    // Event date
    eventDate: {
      type: Date,
      required: [true, "Event date is required."],
    },

    // Event start time
    eventStart: {
      type: Date,
      required: [true, "Event start time is required."],
    },

    // Event end time
    eventEnd: {
      type: Date,
      required: [true, "Event end time is required."],
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
      required: [true, "Event price is required"],
      min: 0,
    },

    // Image representing the event
    eventImage: {
      type: String,
      required: [true, "Event image is required"],
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
      required: [true, "Event category is required"],
    },

    // Event status - defaults to "upcoming"
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed", "cancelled"],
      default: "upcoming",
    },
  },
  {
    // Add createdAt & updatedAt timestamps
    timestamps: true,

    // Customize JSON output when sending responses
    toJSON: {
      virtuals: true, //include virtual fields
      transform: function (doc, ret) {
        // Replace `_id` with `id`
        ret.id = ret._id;

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

        // Clean up MongoDB internal fields
        delete ret._id;
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
