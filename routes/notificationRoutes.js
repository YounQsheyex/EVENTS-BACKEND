const router = require("express").Router();
const {
  deleteNotification,
  getAllUnreadNotifications,
  getAllNotifications,
  createNotification,
  markAsRead,
} = require("../controllers/notifications");
const { isUser, isAdmin, isSuperAdmin } = require("../middleware/auth");

router.post("/create", isUser, isAdmin, createNotification);
router.get("/", getAllNotifications);
router.get("/unread", isUser, getAllUnreadNotifications);
router.patch("/mark/:id", isUser, isAdmin, markAsRead);
router.delete("/delete/:id", isUser, isAdmin, isSuperAdmin, deleteNotification);

module.exports = router;
