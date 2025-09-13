const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    firstname: {
      type: String,
      required: [true, "First Name is Required"],
    },
    lastname: {
      type: String,
      required: [true, "Last Name is Required"],
    },
    email: {
      type: String,
      required: [true, "Email Adress is Required"],
      unique: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    phoneNumber: {
      type: String,
      unique: true,
      match: /^\+?[1-9][0-9]{7,14}$/,
    },
    password: {
      type: String,
      minlength: [6, "Minimum Password length is 6"],
      required: [true, "Password is Required"],
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationTokenExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  { timestamps: true }
);

const USER = mongoose.model("users", userSchema);
module.exports = USER;
