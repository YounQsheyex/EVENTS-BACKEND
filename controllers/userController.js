const USER = require("../models/usersSchema");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const generateToken = require("../helpers/generateToken");
const { sendWelcomeEmail, sendResetEmail } = require("../emails/sendemails");

const handleRegister = async (req, res) => {
  const { firstname, lastname, email, phoneNumber, password, role } = req.body;
  try {
    const userExist = await USER.findOne({
      $or: [{ email: email || null }, { phoneNumber: phoneNumber || null }],
    });
    if (userExist) {
      res.status(400).json({ message: "Email or Phone Number Already Exist" });
    }
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationToken = generateToken();
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

    const user = await USER.create({
      firstname,
      lastname,
      email,
      phoneNumber,
      password: hashedPassword,
      role: role || "user",
      verificationToken,
      verificationTokenExpires,
    });
    const clientUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    await sendWelcomeEmail({
      email: user.email,
      firstname: user.firstname,
      clientUrl,
    });
    return res.status(201).json({
      success: true,
      message: "Account Registration Successful",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { handleRegister };
