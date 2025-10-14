const router = require("express").Router()
const {handleCreateTicket, handleUpdateTicket,handleGetAllTicket,handleDeleteTicket} = require("../controllers/ticketController")

router.post("/createTicket/:eventId", handleCreateTicket)
router.get("/getAllTicket/:eventId", handleGetAllTicket)
router.patch("/update/:ticketId", handleUpdateTicket)
router.delete("/delete/:ticketId", handleDeleteTicket)

module.exports = router