const router = require("express").Router();
const {
  handlePaymentInitialization,
  handlePaymentVerification,
  handleAllTransactions,
  handleUserTicket,
  getSalesOverview,
  handleAllTickets,
} = require("../controllers/paymentsController");

const { isAdmin, isUser } = require("../middleware/auth");

router.post("/initialize/:ticketId", isUser, handlePaymentInitialization);
router.get("/verify", handlePaymentVerification);
router.get("/allTransactions", isUser, handleAllTransactions);
router.get("/myTicket", isUser, handleUserTicket);
router.get("/allTicket", isUser, handleAllTickets);
router.get("/revenue", isUser, getSalesOverview);

module.exports = router;
