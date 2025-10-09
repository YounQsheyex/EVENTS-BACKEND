const express = require("express");
const passport = require("passport");
const { googleCallback, finalizeGoogle } = require("../controllers/googleAuth");
const User = require("../models/usersSchema");

const router = express.Router();

// Step 1: Redirect to Google for login
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Step 2: Google redirects back to your app with tokens
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/auth/failure",
  }),
  googleCallback
);

// Step 3: Finalize Google login/signup after user selects email
router.post("/google/finalize", finalizeGoogle);

module.exports = router;
