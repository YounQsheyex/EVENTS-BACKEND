// controllers/googleAuth.js
const jwt = require("jsonwebtoken");
const User = require("../models/usersSchema");
const { sendGoogleWelcomeEmail } = require("../emails/googleSendMail");

/**
 * Handles the Google OAuth callback.
 * Generates a temporary JWT to track the Google session.
 * Redirects to frontend to finalize login or choose an email if multiple exist.
 */
const googleCallback = async (req, res) => {
  try {
    const { googleId, firstname, lastname, emails } = req.user;

    // Create temporary token valid for 30 minutes
    const tempToken = jwt.sign(
      { googleId, firstname, lastname, emails },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    if (emails.length === 1) {
      // Only one email: skip "choose email" step
      const chosenEmail = emails[0];
      return res.redirect(
        `http://localhost:5173/finalize-google?token=${tempToken}&chosenEmail=${encodeURIComponent(
          chosenEmail
        )}`
      );
    }

    // Multiple emails: frontend will ask user to choose one
    return res.redirect(
      `http://localhost:5173/choose-email?token=${tempToken}&emails=${encodeURIComponent(
        JSON.stringify(emails)
      )}`
    );
  } catch (err) {
    res
      .status(500)
      .json({ message: "Google sign-in failed", error: err.message });
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
  // } catch (error) {
  //   console.error(error);
  //   return res.status(500).json({
  //     message: "An error occurred during registration via Google.",
  //   });
  // }
};

/**
 * Finalizes Google sign-in after frontend receives temp token.
 * Creates a new user if they don’t exist and sends welcome email.
 * Returns a final JWT and refresh token for authentication.
 */
const finalizeGoogle = async (req, res) => {
  const { token, chosenEmail } = req.body;

  try {
    // Decode temp token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const emails = decoded.emails || [];

    let emailToUse;

    if (emails.length === 1) {
      // Only one email: automatically select
      emailToUse = emails[0];
    } else {
      // Multiple emails: ensure frontend sent a valid choice
      if (!chosenEmail || !emails.includes(chosenEmail)) {
        return res
          .status(400)
          .json({ message: "Choose which email to use", emails, token });
      }
      emailToUse = chosenEmail;
    }

    // Check if user already exists
    let user = await User.findOne({
      $or: [{ googleId: decoded.googleId }, { email: emailToUse }],
    });

    if (!user) {
      // Create new user
      user = await User.create({
        googleId: decoded.googleId,
        firstname: decoded.firstname,
        lastname: decoded.lastname,
        email: emailToUse,
        provider: "google",
        isVerified: true,
      });

      // Send welcome email to new users only
      await sendGoogleWelcomeEmail({
        firstname: user.firstname,
        email: user.email,
      });
    }

    // Generate authentication tokens
    const loginToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      message: "Login successful",
      token: loginToken,
      refreshToken,
      user,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error finalizing Google sign-in",
      error: error.message,
    });
  }
};

module.exports = { googleCallback, finalizeGoogle };
