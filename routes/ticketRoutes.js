const router = require("express").Router()
const {createTicket, updateTicket, deleteTicket} = require("../controllers/ticketController")

router.post("/createTicket", createTicket)
router.patch("/update/:ticketId", updateTicket)
router.delete("/delete/:ticketId", deleteTicket)

module.exports = router