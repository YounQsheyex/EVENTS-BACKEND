const jwt = require("jsonwebtoken");
const User = require("../models/usersSchema");
const { sendWelcomeEmail } = require("../emails/sendemails");

const googleCallback = async (req, res) => {
  try {
    const user = req.user;

    if (user.isVerified) {
      return res.status(400).json({
        message: "User already registered and verified. Please log in.",
      });
    }

    if (!user.isVerified) {
      const verificationToken = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      const clientUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

      await sendWelcomeEmail({
        email: user.email,
        firstname: user.firstname,
        clientUrl,
      });

      return res.status(200).json({
        message:
          "Registration successful. Please check your email to verify your account.",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "An error occurred during registration via Google.",
    });
  }
};

module.exports = {
  googleCallback,
};
