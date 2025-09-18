const express = require("express");
const passport = require("passport");
const { googleCallback } = require("../controllers/googleAuth");

const router = express.Router();

router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
    "/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: "/auth/failure" }),
    googleCallback
);

module.exports = router;
