const paystack = require("paystack")(process.env.PAYSTACK_SECRET_KEY)
const mongoose = require("mongoose")
const PAYMENT = require("../models/mainPaymentSchema");
const EVENTS = require("../models/eventsSchemaa");
const USER = require("../models/usersSchema");
// const paymentSchema = require("../models/paymentSchema");

const handlePaymentInitialization = async(req,res,next)=>{
    const {quantity,firstname,lastname,email} = req.body
    const {ticketId} = req.params
    const { accountId: userId, accountEmail:userEmail } = req.user;

    if(!quantity||
        !firstname ||
        !lastname ||
        !email ||
        !ticketId
    ){
    return res.status(400).json({
      success: "fail",
      message: "Please enter necessary credentials",
    });
    }
// covert to number
    const requestedQuantity = parseInt(quantity, 10); 

   if (isNaN(requestedQuantity) || requestedQuantity <= 0) {
    return res.status(400).json({
      success: "fail",
      message: "Invalid quantity specified(data type)",
    });
  }
  
  try {
    const event = await EVENTS.findOne({ "tickets._id": ticketId })

     if (!event) {
            return res.status(404).json({
                success: "fail",
                message: "Event or Ticket not found.",
            });
        } 

        // Add this check after finding the event:
        if (event.status !== "live") {
            return res.status(400).json({
                success: "fail",
                message: "This event is not currently open for ticket purchases.",
            });
        }

        const ticket = event.tickets.id(ticketId);
    
        // Ensure the ticket is not 'free' for payment initialization
        if (ticket.type === "free") {
            return res.status(400).json({
                success: "fail",
                message: "This is a free ticket. Payment is not required.",
            });
        }
        // comparing the available ticket with the quantity the client is trying to purchase
        if (ticket.quantityAvailable < requestedQuantity) {
            return res.status(400).json({
                success: "fail",
                message: `Only ${ticket.quantityAvailable} tickets remaining.`,
            });
        }

        // Check max per order limit
        if (requestedQuantity > ticket.maxPerOrder) {
            return res.status(400).json({
                success: "fail",
                message: `You can only purchase a maximum of ${ticket.maxPerOrder} ticket(s) per order.`,
            });
        }

        // paystack get the our numbers as cent or kobo 
        const totalAmount = (ticket.price * requestedQuantity * 100).toFixed(0)

        // generating a payment reference with datas i think are essential
        const reference = `TKT_${ticketId}_${Date.now()}_${userId}`;

        const response = await paystack.transaction.initialize({
        email,
        amount: totalAmount,
        reference: reference,
        currency: "NGN",
        callback_url: `${process.env.BACKEND_URL_TEST}/api/payments/verify`,
        metadata: {
            user: userId,
            userEmail: userEmail,
            ticket: ticketId,
            quantity: requestedQuantity,
            firstname: firstname,
            lastname: lastname,
        },
        });

        if (!response.status || !response.data) {
            console.error("Paystack Initialization Failed:", response);
            return res.status(400).json({
                status: "fail",
                message:
                response.message ||
                "Failed to initialize payment with Paystack. Check your API key and input data.",
                });
        }

        const payment = await PAYMENT.create({
              user: userId,
              email:email,
              firstname: firstname,
              lastname: lastname,
              ticket: ticketId,
              reference,
              amount: totalAmount,
              quantity: requestedQuantity,
              status: "pending",
            });

            res.status(200).json({
            status: "success",
            message: "Payment initialized. redirect user to the checkout page(authorization_url)",
            data: {
                authorization_url: response.data.authorization_url,
                access_code: response.data.access_code,
                reference: reference,
                amount: totalAmount,
                paymentId: payment._id,
            },
            });

  } catch (error) {
    next()
  }
}

const handlePaymentVerification = async(req,res,next)=>{
    const reference = req.query.reference || req.params.reference;

      if (!reference) {
    return res.status(400).json({
      success: "fail",
      message: "Reference not found or Invalid payment reference",
    })}

    try {
        const payment = await PAYMENT.findOneAndUpdate(
            {
                reference,
                status: "pending",
            },
            {
                status: "processing",
                processingStartedAt: new Date(),
            },
            {
                new: true,
                runValidators: true,
            }
            );
        
           if (!payment) {
            // The lock failed. It's either an invalid reference or it's already processed.
                const existingPayment = await paymentSchema.findOne({ reference });

                if (!existingPayment) {
                    // Case 1: Invalid/Missing Reference
                    return res.status(404).json({
                        status: "fail",
                        message: "Payment record not found for this reference.",
                    });
                }
                
                // Case 2: Already Processed (Status is 'success', 'failed', or 'processing' from another process)
                return res.status(200).json({
                    status: "success",
                    message: `Transaction already finalized with status: ${existingPayment.status}`,
                    data: { reference: existingPayment.reference, status: existingPayment.status },
                });
            }

            const transactionResult = await paystack.transaction.verify(reference);
            const data = transactionResult?.data;

        if (
            !transactionResult ||
            !data ||
            data.status !== "success"
        ) {
            // Update local status to failed/error before returning
            await PAYMENT.findOneAndUpdate({ reference }, { status: "failed", verificationData: data });
            const paystackMessage = transactionResult ? transactionResult.message || "Transaction failed or pending" : "Paystack returned an invalid response.";
            
            return res.status(400).json({
                status: "fail",
                message: `Verification Failed: ${paystackMessage}`,
            });
        }


        // --- 3. CRITICAL SECURITY CHECK: AMOUNT CONSISTENCY ---
        // Amount is stored in kobo/cents. Ensure no tampering occurred.
        if (data.amount.toString() !== payment.amount.toString()) {
            console.error(`Amount Mismatch: Expected ${localPayment.amount}, Received ${data.amount}`);
            await PAYMENT.findOneAndUpdate({ reference }, { status: "amount_mismatch", verificationData: data });
            return res.status(400).json({
                status: "fail",
                message: "Security Error: Amount paid does not match expected amount.",
            });
        }

        const requestedQuantity = payment.quantity;
        const ticketId = payment.ticket;
        
        const user = await USER.findById(payment.user);
        const event = await EVENTS.findOne({ "tickets._id": ticketId })
            
        if(!user || !event){
            return res
            .status(404)
            .json({ status: "fail", message: "Ticket or User data missing." }); 
        }
        
            const specificTicket = event.tickets.id(ticketId)
            const session = await mongoose.startSession();
            let generatedTickets = [];
        
        try {
            session.startTransaction();
            
           const updatedEvent = await EVENTS.findOneAndUpdate(
                { 
                    "tickets._id": ticketId,
                    "tickets.quantityAvailable": { $gte: requestedQuantity }
                },
                {
                    $inc: { "tickets.$.quantityAvailable": -requestedQuantity }
                },
                { new: true, session } 
            );

            if (!updatedEvent) {
                await session.abortTransaction();
                finalStatus = 'inventory_error';
                await PAYMENT.findOneAndUpdate({ reference }, { status: finalStatus, verificationData: data });
                return res.status(409).json({ status: "fail", message: "Ticket inventory sold out. Contact support." });
            }


        payment.status = "success";
        payment.paidAt = new Date();
        payment.gatewayResponse = transactionResult.data;
        payment.ticketInstances = generatedTickets.map((t) => t._id);
        await payment.save({ session }); // Commit the transaction only after ALL operations are successful

        await session.commitTransaction()
        } catch (error) {
            
        }
        
        
    } catch (error) {
        
    }
}
module.exports = {handlePaymentInitialization,
handlePaymentVerification,
}