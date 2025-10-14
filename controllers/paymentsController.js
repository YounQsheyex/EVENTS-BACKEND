const paymentSchema = require("../models/paymentSchema");
const ticketSchema = require("../models/ticketSchema");
const userSchema = require("../models/usersSchema");
const ticketInstanceSchema = require('../models/ticketIntanceSchema');
const paystack = require("paystack")(process.env.PAYSTACK_SECRET_KEY);
// const { processSuccessfulPayment } = require("../helpers/verifyPaymentSuccess");
const { sendPaymentConfirmationEmail, sendVerifyPaymentlink } = require("../emails/sendemails");
const { generateTicketInstances } = require("../helpers/ticketInstance");


const baseUrl = process.env.BACKEND_URL.replace(/\/$/, ''); 


const handlePaymentInitialization = async (req, res, next) => {
    const { quantity: Quantity, firstname, lastname } = req.body;
    const { ticketId } = req.params;
    const {  _id: userId, email } = req.user;

    if (!ticketId || !Quantity || !firstname || !lastname) {
        return res.status(400).json({
            success: "fail",
            message: "Please enter necessary credentials"
        });
    }

    const requestedQuantity = parseInt(Quantity, 10);

    // Validate quantity
    if (isNaN(requestedQuantity) || requestedQuantity <= 0) {
        return res.status(400).json({
            success: "fail",
            message: "Invalid quantity specified"
        });
    }

    try {
        const ticket = await ticketSchema.findById(ticketId);

        if (!ticket || ticket.status === "sold out" || ticket.status === "unavailable") {
            return res.status(404).json({
                success: "fail",
                message: "Ticket not available or sold out"
            });
        }

        // Check if enough quantity is available
        if (ticket.quantity < requestedQuantity) {
            return res.status(400).json({
                success: "fail",
                message: `Only ${ticket.quantity} of ${ticket.type} tickets are available.`
            });
        }

        // Calculate total amount
        const totalAmount = ticket.price * requestedQuantity;
        
        // Generate secure reference
        // added userid incase i forget
        const reference = `TKT_${ticketId}_${Date.now()}_${userId}`; 

        const response = await paystack.transaction.initialize({
            email,
            amount: totalAmount * 100, // Convert to kobo
            reference: reference,
            callback_url: `${process.env.BACKEND_URL_TEST}/api/payments/verify`,
            metadata: {
                user: userId,
                ticket: ticketId,
                quantity: requestedQuantity,
                firstname: firstname,
                lastname: lastname
            }
        });

         if (!response.status || !response.data) {
             console.error("Paystack Initialization Failed:", response);
             return res.status(400).json({
                 status: "fail",
                 message: response.message || "Failed to initialize payment with Paystack. Check your API key and input data."
             });
        }

        const payment = await paymentSchema.create({
            user: userId,
            firstname: firstname,
            lastname: lastname,
            ticket: ticketId,
            reference,
            amount: totalAmount,
            quantity: requestedQuantity,
            status: "pending"
        });


        // setImmediate(async () => {
        //     try {
        //         await sendVerifyPaymentlink({
        //             email: email,
        //             lastname: sanitizedLastname,
        //             reference: reference,
        //             amount: totalAmount,
        //             status: "pending",
        //             currency: "NGN",
        //             ticketDetails: {
        //                 eventName: ticket.eventName || ticket.event || 'Event',
        //                 ticketType: ticket.type,
        //                 quantity: requestedQuantity,
        //                 pricePerTicket: ticket.price
        //             },
        //             verificationLink: confirmationLink
        //         });
        //     } catch (emailError) {
        //         console.error("Failed to send payment link email:", emailError);
        //         // TODO: Add to retry queue
        //     }
        // });

        res.status(200).json({
            status: "success",
            message: "Payment initialized. Check your email to proceed.",
            data: {
                authorization_url: response.data.authorization_url,
                access_code: response.data.access_code,
                reference: reference,
                amount: totalAmount,
                paymentId: payment._id
            }
        });
    } catch (error) {
        next(error);
    }
};

// ticketPaymentController.js



// ... (handlePaymentInitialization remains the same) ...

const handlePaymentVerification = async (req, res, next) => {
    const reference = req.query.reference || req.params.reference;

    if (!reference) {
        return res.status(400).json({
            success: "fail",
            message: "Invalid payment reference"
        });
    }

    try {
        // Verify transaction with Paystack
        const transactionResult = await paystack.transaction.verify(reference);
        // console.log("Paystack verification:", transactionResult);

        if (transactionResult.data.status !== "success") {
            return res.status(400).json({
                status: "fail",
                message: "Transaction failed or pending"
            });
        }

        // Find payment record
        // trying the find and update block to 
        const payment = await paymentSchema.findOneAndUpdate(
            { 
                reference, 
                status: "pending"
            },
            { 
                status: "processing",
                processingStartedAt: new Date()
            },
            { 
                new: true,
                runValidators: true 
            }
        );

        if (!payment) {
            return res.status(404).json({
                status: "fail",
                message: "Payment record not found for this reference."
            });
        }
        
        // PREVENT DOUBLE PROCESSING
        if (payment.status === "success") {
            // In a real app, you would look up the generated ticket instances here
            return res.status(200).json({
                status: "success",
                message: "Transaction already verified and processed.",
                data: {
                    reference: payment.reference,
                    // ... other data
                }
            });
        }

        // --- FETCH NECESSARY DATA ---
        const ticket = await ticketSchema.findById(payment.ticket);
        const user = await userSchema.findById(payment.user); 
        
        console.log({user:user})
        console.log({ticket:ticket})


        
        if (!ticket || !user) {
            // Handle missing data - critical error
            return res.status(404).json({ status: "fail", message: "Ticket or User data missing." });
        }
        
        const purchasedQuantity = payment.quantity;

        // Start session for atomic operations
        const session = await paymentSchema.startSession();
        let generatedTickets = []; 

        try {
            await session.startTransaction();

            // 1. Inventory Check & Update
            if (ticket.quantity >= purchasedQuantity) {
                ticket.quantity -= purchasedQuantity;
                if (ticket.quantity === 0) {
                    ticket.status = "sold out";
                }
                await ticket.save({ session });
            } else {
    // Inventory Over-Sale - ABORT TRANSACTION
    await session.abortTransaction();
    // It might be better to throw a specific error that leads to a refund process
    // Or a retry if a concurrent request just updated the inventory.
    const error = new Error("Inventory oversold for this ticket.");
    error.statusCode = 409; // Conflict
    throw error; 
}

            // 2. Generate Ticket Instances (CRITICAL FIX: SESSION PASSED)
            generatedTickets = await generateTicketInstances(
                payment, 
                ticket, 
                user,
                session
            );
            console.log(`Generated ${generatedTickets.length} ticket instances.`);

            // 3. Update Payment Status
            payment.status = "success";
            payment.paidAt = new Date();
            payment.gatewayResponse = transactionResult.data;
            payment.ticketInstances = generatedTickets.map(t => t._id);
            await payment.save({ session }); 

            // Commit the transaction only after ALL operations are successful
            await session.commitTransaction();

            // --- POST-TRANSACTION ACTIONS (Emails) ---
            const customerEmail = user.email;
            const customerName = payment.lastname || payment.firstname || 'Customer';
            const amount = payment.amount / 100;
            const currency = transactionResult.data.currency;

            // This object contains the full list of generated tickets, suitable for the email template
            const emailTicketDetails = {
                eventName: ticket.eventName || ticket.event || 'Event',
                ticketType: ticket.type,
                quantity: purchasedQuantity,
                pricePerTicket: ticket.price,
                generatedTickets: generatedTickets.map(t => ({ number: t.ticketNumber, token: t.ticketToken })) 
            };
            
            // This is the clean summary object for the final API response
            const clientTicketSummary = {
                eventName: emailTicketDetails.eventName,
                ticketType: emailTicketDetails.ticketType,
                quantity: emailTicketDetails.quantity,
                pricePerTicket: emailTicketDetails.pricePerTicket,
            };

            try {
                // Assuming sendPaymentConfirmationEmail function exists and is imported
                await sendPaymentConfirmationEmail({
                    email: customerEmail,
                    lastname: customerName,
                    reference: payment.reference,
                    amount: amount,
                    status: payment.status,
                    currency: currency,
                    ticketDetails: emailTicketDetails // Pass the full object for the email template
                });
            } catch (emailError) {
                res.status(400).json({success:"false", message:"Failed to send confirmation email"})
                console.error("Failed to send confirmation email:", emailError);
            }

            // --- FINAL SUCCESS RESPONSE ---
            res.status(200).json({
                status: "success",
                message: "Transaction verified and tickets generated successfully",
                data: {
                    reference: payment.reference,
                    amount: payment.amount,
                    currency: currency,
                    status: payment.status,
                    paidAt: payment.paidAt,
                    
                    // FIX: Use the summary object without the duplicated ticket list
                    ticketDetails: clientTicketSummary, 
                    
                    // This is the clean, single list of tickets for the client
                    tickets: generatedTickets.map(t => ({ 
                        _id: t._id,
                        number: t.ticketNumber,
                        token: t.ticketToken,
                    }))
                }
            });
        } catch (transactionError) {
            await session.abortTransaction();
            // Important: Propagate the error up
            throw transactionError; 
        } finally {
            session.endSession();
        }
    } catch (error) {
        console.error("Payment verification error:", error);
        // This ensures the error is correctly handled by Express error handler
        next(error); 
    }
};



const handleAllTransactions = async (req, res, next) => {
    // Robustly extract user ID from req.user (which holds the Mongoose document)

    try {
        const transactions = await paymentSchema
            .find()
            // Populate the 'user' and 'ticketId' fields as before
            .populate("user", "firstname lastname email")
            .populate("ticket", "quantity type price eventName event status")
            // ADDED: Populate the 'ticketInstances' array and select token/number
            .populate("ticketInstances", "ticketToken ticketNumber") 
            .sort({ createdAt: -1 }); // Most recent first

        res.status(200).json({
            status: "success",
            results: transactions.length,
            data: {
                transactions
            }
        });
    } catch (error) {
        next(error);
    }
};

const handleUserTicket = async(req,res,next)=>{
    // Robustly extract user ID from req.user (which holds the Mongoose document)
    const { _id: userId } = req.user; 

    try {
        // Assuming your TicketInstance schema is named 'ticketInstanceSchema'
        const userTickets = await ticketInstanceSchema 
            .find({ user: userId })
            // Populate the associated ticket type/event details for context
            .populate("ticketType", "eventName event type location") 
            .select("ticketNumber ticketToken status attendeeName"); // Select relevant fields

        res.status(200).json({
            status: "success",
            results: userTickets.length,
            data: {
                tickets: userTickets
            }
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    handlePaymentInitialization,
    handlePaymentVerification,
    handleAllTransactions,
    handleUserTicket
};