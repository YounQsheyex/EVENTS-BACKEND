const router = require("express").Router();
const {
  handleRegister,
  userLogin,
  handleVerifyEmail,
  resendVerificationEmail,
  handleForgotPassword,
  handleResetPassword,
} = require("../controllers/userController");

router.post("/register", handleRegister);
router.post("/login", userLogin);
router.post("/verify-email/:token", handleVerifyEmail);
router.post("/resend-email", resendVerificationEmail);
router.post("/forgot-password", handleForgotPassword);
router.post("/reset-password", handleResetPassword);

module.exports = router;
