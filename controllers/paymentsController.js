const paymentSchema = require("../models/paymentSchema")
const ticketSchema = require("../models/ticketSchema")
const userSchema = require("../models/usersSchema")
const paystack = require("paystack")(process.env.PAYSTACK_SECRET_KEY)
const {processSuccessfulPayment} = require("../helpers/verifyPaymentSuccess")
const {sendPaymentConfirmationEmail} = require("../emails/sendemails")


const handlePaymentInitialization = async(req,res,next)=>{
    const { quantity: requestedQuantity,firstname,lastname} = req.body
    const {ticketId} = req.params
    const {userId,email} = req.user

    if( !ticketId || !requestedQuantity || !firstname || !lastname){
     return res.status(400).json({
        success:"fail",
        message:"please enter necessary credentials"
    }) }

    try {
       const ticket = await ticketSchema.findById(ticketId)

       if(!ticket || ticket.status === "sold out" || ticket.status === "unavailable" ){
        return res.status(404).json({
            success:"fail",
            message:"Ticket not available or sold out"
        })
    }
    
    // const eventname = await userSchema.findById

     // Check if enough quantity is available
    if(ticket.quantity < requestedQuantity){
        return res.status(400).json({
            success:"fail",
            message:`Only ${ticket.quantity} of ${ticket.type} tickets are available.`
        })
    }

// Calculate total amount price provided plus the requested quantity
    const totalAmount = ticket.price * requestedQuantity
// transaction reference
    const reference = `${ticketId}_${Date.now()}`;
        
    const response = await paystack.transaction.initialize({
        email,
        firstname:firstname,
        lastname:lastname,
        amount:totalAmount * 100,
        reference:reference,
        callback_url: `${process.env.BACKEND_URL_TEST}/api/payments/verify`,
    })

    const payment = await paymentSchema.create({
       user:userId,
       firstname:firstname,
       lastname:lastname,
       ticketId:ticketId,
    //    eventname:
       reference,
       amount:totalAmount,
       quantity:requestedQuantity,
       status:"pending"

    })

     res.status(200).json({
      status: "success",
      message: "Payment initialized",
      resData:response,
      PaymentData:payment
        
    })
    } catch (error) {
        next(error)
    }
}

const handlePaymentVerification = async (req,res,next)=>{
    const reference = req.query.reference || req.params.reference;

    if(!reference){
        res.status(400).json({
            success:"fail",
            message:"invaild payment refrence"
        })
    }

    try {
    const transactionResult = await paystack.transaction.verify(reference);
      console.log(transactionResult)  

      if (transactionResult.data.status !== "success") {
      return res.status(400).json({
        status: "fail",
        message: "Transaction failed",
      });
    }

   const payment = await processSuccessfulPayment(reference, transactionResult.data)
    console.log(payment)

     if (!payment) {
      return res.status(404).json({
        status: "fail",
        message: "Payment record not found",
      });
    }


    // PREVENT DOUBLE PROCESSING
    if (payment.status === "success") {
        return res.status(200).json({
            status: "success",
            message: "Transaction already verified and processed.",
            payment,
        });
    }


    payment.status = "success";
    payment.paidAt = new Date();
    payment.gatewayResponse = transactionResult.data;
    // await payment.save();

     const ticket = payment.ticket
    const purchasedQuantity = payment.quantity

    // Check inventory before decrementing
    if (ticket.quantity >= purchasedQuantity) {
      ticket.quantity -= purchasedQuantity;
      if (ticket.quantity === 0) {
          ticket.status = "sold out"; 
      }
      await ticket.save()
    } else {
        console.error(`INVENTORY ERROR: Ticket ID ${ticket._id} (${ticket.type}) had ${ticket.quantity} left, but payment for ${purchasedQuantity} went through.`);
    }
    
    await payment.save();


    const customerEmail = transactionResult.data.customer.email;
    const customerName = transactionResult.data.metadata.firstname || 'Customer';
    const amount = transactionResult.data.amount;
    const currency = transactionResult.data.currency;
    
    const ticketDetails = {
        eventName: ticket.eventName,
        quantity: purchasedQuantity
    };

        await sendPaymentConfirmationEmail({
            email: customerEmail,
            firstname: customerName,
            reference: reference,
            amount: amount,
            quantity:quantity,
            currency: currency,
            ticketDetails: ticketDetails, 

        });

    res.status(200).json({
      status: "success",
      message: "Transaction verified successfully",
      payment,
    });


} catch (error) {
        next(error)
    }}



 const handleAllTransactions = async (req,res,next)=>{
        
    const {userId} = req.user

        try {
            const userTicket = await paymentSchema.findById(userId)
            .populate("user", "firstname lastname email")
            .populate("ticket", "quantity type price")

             res.status(200).json({
                status: "success",
                results: transaction.length,
                transaction
    });
        } catch (error) {
            next(error)
        }
    }
    
module.exports = {
    handlePaymentInitialization,
    handlePaymentVerification,
    handleAllTransactions
}