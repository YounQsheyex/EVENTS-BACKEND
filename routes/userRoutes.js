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
  handleGetUser,
  handleUpdateUser,
  createAdmin,
  getAllAdmin,
  deleteAdmin,
} = require("../controllers/userController");
const { isUser, isAdmin, isSuperAdmin } = require("../middleware/auth");

router.post("/register", handleRegister);
router.post("/login", userLogin);
router.post("/verify-email/:token", handleVerifyEmail);
router.post("/resend-email", resendVerificationEmail);
router.post("/forgot-password", handleForgotPassword);
router.post("/reset-password", handleResetPassword);
router.post("/change-password/:id", isUser, handleChangePassword);
router.get("/all-users", isUser, isAdmin, getAllUsers);
router.get("/single-user", isUser, handleGetUser);
router.patch("/update-user", isUser, handleUpdateUser);
router.post("/create-admin", isUser, isSuperAdmin, createAdmin);
router.get("/all-admin", isUser, isSuperAdmin, getAllAdmin);
router.delete("/delete-admin/:id", isUser, isSuperAdmin, deleteAdmin);

module.exports = router;
