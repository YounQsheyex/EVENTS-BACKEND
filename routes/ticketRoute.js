const express = require("express");
const ticketRouter = express.Router();

// Import ticket controllers
const {
  purchaseTicket,
  deleteTicket,
} = require("../controllers/ticketController.js");

// Import authentication & authorization middleware
const authMiddleware = require("../middleware/adminMiddleware.js");

/*-----------------------------------------------
 Ticket Routes
-------------------------------------------------
 - POST   /api/tickets      → Purchase a ticket
 - DELETE /api/tickets/:id  → Delete a ticket (owner or admin)
-------------------------------------------------*/

// ✅ Purchase a ticket
// Requires user to be authenticated
ticketRouter.post("/", authMiddleware, purchaseTicket);

// ✅ Delete a ticket
// Requires user to be authenticated; owner or admin can delete
ticketRouter.delete("/:id", authMiddleware, deleteTicket);

module.exports = ticketRouter;
