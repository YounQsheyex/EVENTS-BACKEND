const router = require("express").Router()
const {handleCreateTicket, handleUpdateTicket,handleGetAllTicket,handleDeleteTicket,handleClearEventTickets} = require("../controllers/ticketController")

router.post("/create/:eventId", handleCreateTicket)
router.get("/getAll/:eventId", handleGetAllTicket)
router.patch("/update/:ticketId", handleUpdateTicket)
router.delete("/delete/:ticketId", handleDeleteTicket)
router.delete("/delete/:eventId ", handleClearEventTickets)
module.exports = router