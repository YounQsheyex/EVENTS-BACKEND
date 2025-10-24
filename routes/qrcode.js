const router = require("express").Router()
const {verifyTicketScan} = require("../controllers/verifyQrcode")
const { isAdmin, isUser } = require("../middleware/auth");

router.post("/verifyQrcode",isUser, verifyTicketScan)

module.exports = router