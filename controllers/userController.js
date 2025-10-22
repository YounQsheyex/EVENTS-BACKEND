const USER = require("../models/usersSchema");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const generateToken = require("../helpers/generateToken");
const {
  sendWelcomeEmail,
  sendResetEmail,
  sendAdminEmail,
} = require("../emails/sendemails");
const { use } = require("passport");

// registration controller
const handleRegister = async (req, res) => {
  const { firstname, lastname, email, phoneNumber, password, role } = req.body;
  try {
    const userExist = await USER.findOne({
      $or: [{ email: email || null }, { phoneNumber: phoneNumber || null }],
    });
    if (userExist) {
      res.status(400).json({ message: "Email or Phone Number Already Existt" });
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

// handle verify user
const handleVerifyEmail = async (req, res) => {
  const { token } = req.params;
  try {
    ///1. find user by token
    const user = await USER.findOne({
      verificationToken: token,
    });
    if (!user) {
      return res.status(404).json({ message: "Invalid verification token" });
    }
    //2. check if token has expired
    if (user.verificationTokenExpires < Date.now()) {
      return res
        .status(400)
        .json({ message: "verification token has expired", email: user.email });
    }
    //3. check if user is already verified
    if (user.isVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }
    //mark the user as verified
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;

    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "Email Verified Successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// handle login
const userLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await USER.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: `Email Address not Found Please Register` });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: "Incorrect Email or Password" });
    }
    if (!user.isVerified) {
      return res
        .status(403)
        .json({ message: "Email Not verified, Check your mail" });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.status(200).json({
      message: "Welcome To EVENTRA",
      token,
      user: {
        email: user.email,
        userId: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
        phoneNumber: user.phoneNumber,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Resend Verification email

const resendVerificationEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await USER.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    // generate a new token and expiration
    const newToken = generateToken();
    const tokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hrs

    user.verificationToken = newToken;
    user.verificationTokenExpires = tokenExpires;
    await user.save();

    const clientUrl = `${process.env.FRONTEND_URL}/verify-email/${newToken}`;

    await sendWelcomeEmail({
      email: user.email,
      firstname: user.firstname,
      clientUrl,
    });

    return res.status(200).json({
      success: true,
      message: "Verification email sent",
      newToken,
    });
  } catch (error) {
    console.error("Error resending verification email:", error);
    res.status(500).json({ message: error.message });
  }
};
// Forgot Password Controller

const handleForgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await USER.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const token = generateToken();
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1hr
    await user.save();

    //send the mail
    const clientUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    await sendResetEmail({
      firstname: user.firstname,
      email: user.email,
      clientUrl,
    });

    res.status(200).json({
      success: true,
      token,
      message: "Password reset link sent to your mail",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Reset Password controller

const handleResetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400), json({ message: "Provide token and new password" });
  }
  try {
    const user = await USER.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res
        .status(404)
        .json({ message: "Invalid or expired link, try again" });
    }
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();
    res
      .status(200)
      .json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
const handleChangePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user._id;

  if (!oldPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: "Please enter  old and new password" });
  }

  try {
    const user = await USER.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const passwordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: "Old Password is Incorrect" });
    }
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await USER.findOneAndUpdate(
      userId,
      { password: hashedPassword },
      { new: true }
    );

    res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await USER.find({ role: "user", isVerified: "true" }).select(
      "-password -verificationToken -verificationTokenExpires"
    ); // Exclude sensitive fields

    if (!users || users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createAdmin = async (req, res) => {
  try {
    const superAdminId = req.user._id; // this assumes JWT middleware populates req.user
    const superAdmin = await USER.findById(superAdminId);

    if (!superAdmin || superAdmin.role !== "superAdmin") {
      return res
        .status(403)
        .json({ message: "Access denied. Not a super admin." });
    }

    const { firstname, lastname, email, phoneNumber } = req.body;

    // Check if email already exists
    const existingUser = await USER.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists." });
    }

    // Generate random password
    const randomPassword = crypto.randomBytes(6).toString("hex"); // e.g., 'f3a9b1c0d2e4'
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // Create admin user
    const admin = new USER({
      firstname,
      lastname,
      email,
      phoneNumber,
      password: hashedPassword,
      provider: "local",
      role: "admin",
      isVerified: true, // Admin created by Super Admin is automatically verified
    });

    await admin.save();
    await sendAdminEmail({
      firstname: admin.firstname,
      email: admin.email,
      password: randomPassword,
    });

    return res.status(201).json({
      success: true,
      message:
        "Admin account created successfully and credentials sent via email.",
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  handleRegister,
  handleVerifyEmail,
  userLogin,
  resendVerificationEmail,
  handleForgotPassword,
  handleResetPassword,
  handleChangePassword,
  getAllUsers,
  createAdmin,
};
