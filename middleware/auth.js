const jwt = require("jsonwebtoken");
// const usersSchema = require("../models/usersSchema"); Uncomment on creating schema
// Adjust path to your User model

/**
 * Admin middleware
 * Protects routes so only admin users can access them
 */
const authMiddleware = async (req, res, next) => {
  try {
    // 1️⃣ Check for token in headers
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // 2️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3️⃣ Get user from database
    // const user = await usersSchema.findById(decoded.id); Uncomment on creating schema
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // 5️⃣ Attach user to request for later use
    req.user = user;
    next();
  } catch (error) {
    console.error("Admin Middleware Error:", error);
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Invalid token" });
  }
};

const isAdmin = async (req, res, next) => {
  try {
    const user = req.user;

    // 4️⃣ Check if user is admin
    if (user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Forbidden: Admins only" });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authMiddleware, isAdmin };
