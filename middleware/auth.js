// Import JSON Web Token library
const jwt = require("jsonwebtoken");

// Import User model
const USER = require("../models/usersSchema");

/* ========================
   MIDDLEWARE: Check if User
   ======================== */
const isUser = async (req, res, next) => {
  try {
    let token;

    // Grab Authorization header (expected format: "Bearer <token>")
    const authHeader = req.headers.authorization;

    // If header missing or token missing → reject request
    if (!authHeader || !authHeader.split(" ")[1])
      return res.status(403).json({
        success: false,
        message: "No token provided",
      });

    // Extract token string after "Bearer"
    token = authHeader.split(" ")[1];

    // verify token to get payload
    const decodeToken = jwt.verify(token, process.env.JWT_SECRET);

    // If decoding fails (invalid or expired token) → reject
    if (!decodeToken)
      return res
        .status(404)
        .json({ success: false, message: "Invalid or expired token." });

    // Look up user in DB using ID from decoded token
    const user = await USER.findById(decodeToken.userId);

    // If user not found → reject
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });

    // Attach user to request for downstream middleware/controllers
    req.user = user;

    // Continue request flow
    next();
  } catch (error) {
    next(error); // Pass errors to error handler
  }
};

/* ========================
   MIDDLEWARE: Check if Admin
   ======================== */
const isAdmin = async (req, res, next) => {
  try {
    const user = req.user; // User should already be attached by isUser middleware

    // If no user found in request → reject
    if (!user)
      return res.status(403).json({ success: true, message: "Unauthorized" });

    // If role is not admin → reject
    if (user.role !== "admin" && user.role !== "superAdmin")
      return res
        .status(403)
        .json({ success: false, message: "Forbidden: for admins only." });

    // User is admin → continue request flow
    next();
  } catch (error) {
    next(error);
  }
};

const isSuperAdmin = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(403).json({ message: "Unthorized" });
    }
    if (user.role !== "superAdmin") {
      return res
        .status(403)
        .json({ message: "Forbidden: Only Super Admins Allowed" });
    }
    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
  }
};

/* ========================
   EXPORT MIDDLEWARES
   ======================== */
module.exports = { isUser, isAdmin, isSuperAdmin };
