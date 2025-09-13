const router = require("express").Router();
const { handleRegister } = require("../controllers/userController");

router.post("/register", handleRegister);

module.exports = router;
