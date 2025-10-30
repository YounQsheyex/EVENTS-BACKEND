const router = require("express").Router();
const {
  deleteNotification,
  getAllUnreadNotifications,
  getAllNotifications,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notifications");
const { isUser, isAdmin, isSuperAdmin } = require("../middleware/auth");
const cache = require("../middleware/redisMiddleware");

router.get(
  "/",
  isUser,
  isAdmin,
  cache("All Notifications: "),
  getAllNotifications
);
router.get("/unread", isUser, isAdmin, getAllUnreadNotifications);
router.patch("/mark/:id", isUser, isAdmin, markAsRead);
router.patch("/mark-all", isUser, isAdmin, markAllAsRead);
router.delete("/delete/:id", isUser, isAdmin, isSuperAdmin, deleteNotification);

module.exports = router;
