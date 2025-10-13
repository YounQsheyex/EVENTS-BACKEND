// // utils/verifyPaymentSuccess.js
// const paymentSchema = require("../models/paymentSchema");
// const ticketSchema = require("../models/ticketSchema");

// const processSuccessfulPayment = async (reference, gatewayData) => {
//   const payment = await paymentSchema.findOne({ reference }).populate("ticket");
//   if (!payment) return null;
//   if (payment.status === "success") return payment; // already processed

//   payment.status = "success";
//   payment.paidAt = new Date();
//   payment.gatewayResponse = gatewayData;
//   await payment.save();

//   const ticket = payment.ticket;
//   const purchasedQuantity = payment.quantity;

//   if (ticket.quantity >= purchasedQuantity) {
//     ticket.quantity -= purchasedQuantity;
//     if (ticket.quantity === 0) ticket.status = "sold out";
//     await ticket.save();
//   }

//   return payment;
// };

// module.exports = {processSuccessfulPayment};