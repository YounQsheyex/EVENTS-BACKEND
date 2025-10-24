const router = require("express").Router();
const {
  createEvents,
  getAllEvents,
  getSingleEvent,
  updateEvent,
  deleteEvent,
} = require("../controllers/eventControl");
const { isUser, isAdmin, isSuperAdmin } = require("../middleware/auth");

router.post("/create-event", isUser, isAdmin, createEvents);
router.get("/all-event", getAllEvents);
router.get("/single-event/:id", isUser, getSingleEvent);
router.patch("/update-event/:id", isUser, isAdmin, updateEvent);
router.patch("/delete-event/:id", isUser, isAdmin, deleteEvent);

module.exports = router;
