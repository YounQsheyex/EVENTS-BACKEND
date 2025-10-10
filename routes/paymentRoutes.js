const router = require("express").Router()
const {
  handlePaymentInitialization,
  handlePaymentVerification,
  handleAllTransactions
} = require("../controllers/paymentsController")

const { isAdmin, isUser } = require("../middleware/auth")

router.post("/initialize/:ticketId", isUser, handlePaymentInitialization);
router.get("/verify", handlePaymentVerification);
router.get("/allTransactions", handleAllTransactions);
// router.get("/myticket/:user", )

module.exports = router;