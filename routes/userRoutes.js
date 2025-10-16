const router = require("express").Router();
const {
  handleRegister,
  userLogin,
  handleVerifyEmail,
  resendVerificationEmail,
  handleForgotPassword,
  handleResetPassword,
  handleChangePassword,
  getAllUsers,
} = require("../controllers/userController");
const { isUser, isAdmin } = require("../middleware/auth");

router.post("/register", handleRegister);
router.post("/login", userLogin);
router.post("/verify-email/:token", handleVerifyEmail);
router.post("/resend-email", resendVerificationEmail);
router.post("/forgot-password", handleForgotPassword);
router.post("/reset-password", handleResetPassword);
router.post("/change-password/:id", isUser, isAdmin, handleChangePassword);
router.get("/all-users", isUser, isAdmin, getAllUsers);

module.exports = router;
