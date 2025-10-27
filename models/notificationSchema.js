const { default: mongoose, Schema } = require("mongoose");

const notifySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      minlength: 3,
      required: true,
    },

    content: {
      type: String,
      minlength: 10,
      required: true,
    },

    views: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        unique: false,
      },
    ],

    about: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model("Notification", notifySchema);
module.exports = Notification;
