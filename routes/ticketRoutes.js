const router = require("express").Router()

// Import middleware for checking admin authorization
const { isAdmin,
        isUser } = require("../middleware/auth");

const {createTicket,
    updateTicket,
    getAllTicket} = require("../controllers/ticketController")

    
// Route: POST /ticket/create
// create an ticket attach to an event by id (admin only)
router.post("/create",isUser, isAdmin, createTicket)


// Route: update /ticket/update/:id
// update an ticket attach to an event by id (admin only)
router.patch("/update/:ticketId",isUser, isAdmin, updateTicket)


// Route: get /ticket/all
// get all ticket attach to an event by id (admin only)
router.get("/all",isUser, getAllTicket)


// Route: delete /ticket/delete/:id
// delete ticket by ID (admin only)
// router.delete("/delete",isUser,isAdmin deleteTicket)


module.exports = router