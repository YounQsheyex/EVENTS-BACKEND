const router = require("express").Router();
const {
  createEvents,
  getAllEvents,
  getSingleEvent,
  updateEvent,
} = require("../controllers/eventControl");
const { isUser, isAdmin, isSuperAdmin } = require("../middleware/auth");

router.post("/create-event", isUser, isAdmin, createEvents);
router.get("/all-event", getAllEvents);
router.get("/single-event/:id", isUser, getSingleEvent);
router.patch("/update-event/:id", isUser, isAdmin, updateEvent);

module.exports = router;
