const router = require("express").Router()
const {
  handlePaymentInitialization,
  handlePaymentVerification,
  handleAllTransactions,
  handleUserTicket,
  getSalesOverview,
  handleAllTickets
} = require("../controllers/paymentsController")

const { isAdmin, isUser, isSuperAdmin } = require("../middleware/auth")

router.post("/initialize/:ticketId", isUser, handlePaymentInitialization);
router.get("/verify", handlePaymentVerification);
router.get("/allTransactions",isUser,isAdmin, handleAllTransactions);
router.get("/myTicket", isUser, handleUserTicket)
router.get("/allTicket", isUser,isAdmin, handleAllTickets)
router.get("/revenue", isUser,isSuperAdmin, getSalesOverview)

module.exports = router;