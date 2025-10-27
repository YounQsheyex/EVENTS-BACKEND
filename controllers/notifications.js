const redisConfig = require("../helpers/redis");
const Notification = require("../models/notificationSchema");

const createNotification = async (req, res, next) => {
  try {
    const { title, content, about } = req.body;

    if (!title || !content || !about)
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });

    const newNotification = await Notification.create({
      title,
      content,
      about,
    });

    await redisConfig.flushall("ASYNC");

    res.status(201).json({
      success: true,
      message: "Notification created successfully",
      notification: newNotification,
    });
  } catch (error) {
    next(error);
  }
};

const getAllNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({});

    if (!notifications.length)
      return res.status(404).json({
        success: false,
        message: "No Notification found",
      });

    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

const getAllUnreadNotifications = async (req, res, next) => {
  try {
    const unreadNotifications = await Notification.find({ unread: true });

    if (!unreadNotifications.length)
      return res.status(404).json({
        success: false,
        message: "All caught up. No unread Notification",
      });

    res.status(200).json({
      success: true,
      unreadNotifications,
    });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    if (!req.params.id)
      return res.status(400).json({
        success: false,
        message: "Notification id is required.",
      });

    if (!["admin", "superAdmin"].includes(req.user.role))
      return res.status(402).json({
        success: false,
        message: "Access denied. Only admins can read notifications",
      });

    const notification = await Notification.findById(req.params.id);

    if (!notification)
      return res.status(404).json({
        success: false,
        message: `Notification not found.`,
      });

    if (notification.views.includes(req.user.id))
      return res.status(400).json({
        success: false,
        message: "Notification has been read before now.",
      });

    await Notification.findByIdAndUpdate(req.params.id, {
      $push: { views: req.user._id },
    });

    await redisConfig.flushall("ASYNC");

    res.status(200).json({
      success: true,
      message: "Notification marked as read successfully",
      info: `${notification.views}`,
    });
  } catch (error) {
    next(error);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    if (!req.params.id)
      return res.status(400).json({
        success: false,
        message: "The id of this notification is required",
      });

    if (req.user.role !== "superAdmin") {
      return res.status(403).json({
        message:
          "Access denied. Only the super admin is allowed to delete events.",
      });
    }

    const deletedNotification = await Notification.findByIdAndDelete(
      req.params.id
    );

    await redisConfig.flushall("ASYNC");

    if (!deletedNotification)
      return res.status(404).json({
        success: false,
        message: "Resource not found",
      });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createNotification,
  markAsRead,
  getAllNotifications,
  getAllUnreadNotifications,
  deleteNotification,
};
