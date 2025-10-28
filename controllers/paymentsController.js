const paymentSchema = require("../models/paymentSchema");
const mongoose = require("mongoose");
// const ticketSchema = require("../models/ticketSchema");
const userSchema = require("../models/usersSchema");
const EVENTS  = require("../models/eventsSchemaa");
const ticketInstanceSchema = require("../models/ticketIntanceSchema");
const paystack = require("paystack")(process.env.PAYSTACK_SECRET_KEY);
// const { processSuccessfulPayment } = require("../helpers/verifyPaymentSuccess");
const {
  sendPaymentConfirmationEmail,
  sendTicket,
} = require("../emails/sendemails");
const { generateTicketInstances } = require("../helpers/ticketInstance");
const redirectToFrontend = require("../helpers/redirect")

const baseUrl = process.env.BACKEND_URL.replace(/\/$/, "");

const handlePaymentInitialization = async (req, res, next) => {
    const { quantity: Quantity, firstname, lastname, email } = req.body;
    const { ticketId } = req.params;
    const { _id: userId} = req.user;

    if (!ticketId || !Quantity || !firstname || !lastname || !email) {
        return res.status(400).json({
            success: "fail",
            message: "Please enter necessary credentials",
        });
    }

    const requestedQuantity = parseInt(Quantity, 10); // Validate quantity

    if (isNaN(requestedQuantity) || requestedQuantity <= 0) {
        return res.status(400).json({
            success: "fail",
            message: "Invalid quantity specified",
        });
    }

    try {
        // ⬅️ CRITICAL CHANGE: Query the Event model using the embedded ticket's ID
        const event = await EVENTS.findOne({ "tickets._id": ticketId });
        
        if (!event) {
            return res.status(404).json({
                success: "fail",
                message: "Event or Ticket not found.",
            });
        }
        
        // Extract the specific ticket subdocument
        const ticket = event.tickets.id(ticketId); 

       
        if (
            !ticket ||
            ticket.status === "sold out"
        ) {
            return res.status(404).json({
                success: "fail",
                message: "Ticket not available or sold out",
            });
        } 
        
        // --- NEW CHECK: Validate Event Status ---
        if (event.status !== "live") {
             return res.status(400).json({
                 success: "fail",
                 message: "This event is not currently accepting orders.",
             });
        }
        // --- Validate against maxOrder limit (using maxPerOrder field) ---

        if (requestedQuantity > ticket.maxPerOrder) { // Assuming maxPerOrder from your original schema
            return res.status(400).json({
                success: "fail",
                message: `You cannot order more than ${ticket.maxPerOrder} tickets per transaction.`,
            });
        } 
        
        // Check if enough quantity is available (using quantityAvailable field)
        if (ticket.quantityAvailable < requestedQuantity) { // Assuming quantityAvailable from your original schema
            return res.status(400).json({
                success: "fail",
                message: `Only ${ticket.quantityAvailable} of ${ticket.name} tickets are available.`,
            });
        } 
        
        // Calculate total amount
        const totalAmount = ticket.price * requestedQuantity; // Generate secure reference 
        const reference = `TKT_${ticketId}_${Date.now()}_${userId}`;

        const response = await paystack.transaction.initialize({
            email,
            amount: totalAmount * 100, // Convert to kobo
            reference: reference,
            callback_url: `${process.env.BACKEND_URL_TEST}/api/payments/verify`,
            metadata: {
                user: userId,
                email:email,
                ticket: ticketId,
                event: event._id.toString(), // ⬅️ IMPORTANT: Pass the event ID in metadata
                quantity: requestedQuantity,
                firstname: firstname,
                lastname: lastname,
            },
        });

        if (!response.status || !response.data) {
            console.error("Paystack Initialization Failed:", response);
            return res.status(400).json({
                status: "fail",
                message: response.message || "Failed to initialize payment with Paystack.",
            });
        }

        const payment = await paymentSchema.create({
            user: userId,
            email:email,
            firstname: firstname,
            lastname: lastname,
            ticket: ticketId,
            event: event._id, // ⬅️ IMPORTANT: Save the Event ID on the Payment record
            reference,
            amount: totalAmount,
            quantity: requestedQuantity,
            status: "pending",
        }); 

        res.status(200).json({
            status: "success",
            message: "Payment initialized. redirect user to the checkout page",
            data: {
                authorization_url: response.data.authorization_url,
                access_code: response.data.access_code,
                reference: reference,
                amount: totalAmount,
                paymentId: payment._id,
            },
        });
    } catch (error) {
        next(error);
    }
};

const handlePaymentVerification = async (req, res, next) => {
    const reference = req.query.reference || req.params.reference;
    let payment; // Declare payment here for access in catch block
    let session;
    let finalStatus = 'error'; // To track payment status for outer catch block

    if (!reference) {
        return res.status(400).json({
            success: "fail",
            message: "Invalid payment reference",
        });
    }

    try {
        // --- 1. Optimistic Lock (Atomic Update) ---
        payment = await paymentSchema.findOneAndUpdate(
            { reference, status: "pending" },
            { status: "processing", processingStartedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!payment) {
            const existingPayment = await paymentSchema.findOne({ reference });

            if (!existingPayment) {
                return redirectToFrontend(res, 'not_found', reference);
            }
            // Already finalized
                return redirectToFrontend(res, existingPayment.status, reference);
        }

        // --- 2. Paystack API Verification ---
        const transactionResult = await paystack.transaction.verify(reference);
        const data = transactionResult?.data;

        if (!transactionResult || !data || data.status !== "success") {
            await paymentSchema.findOneAndUpdate({ reference }, { status: "failed", verificationData: data });
            const paystackMessage = transactionResult ? transactionResult.message || "Transaction failed or pending" : "Paystack returned an invalid response.";
           return redirectToFrontend(res, finalStatus, reference);
        }

        // --- 3. CRITICAL SECURITY CHECK: AMOUNT CONSISTENCY ---
        
        const expectedAmountKobo = (payment.amount * 100).toFixed(0); 
        
        if (data.amount.toString() !== expectedAmountKobo.toString()) {
            console.error(`Amount Mismatch: Expected ${expectedAmountKobo} kobo, Received ${data.amount} kobo`);
            await paymentSchema.findOneAndUpdate({ reference }, { status: "amount_mismatch", verificationData: data });
            return redirectToFrontend(res, finalStatus, reference);
        }
        
        // --- 4. Data Lookup (User and Event) ---
        const purchasedQuantity = payment.quantity; 
        const ticketId = payment.ticket;
        const userId = payment.user;

        const user = await userSchema.findById(userId);
        // ⬅️ CRITICAL CHANGE: Find the event containing the embedded ticket
        const event = await EVENTS.findOne({ "tickets._id": ticketId }); 

        if (!user || !event) {
            await paymentSchema.findOneAndUpdate({ reference }, { status: "review_required" });
           return redirectToFrontend(res, finalStatus, reference);
        }
        const specificTicket = event.tickets.id(ticketId);


        // --- 5. Start Mongoose Transaction ---
        session = await mongoose.startSession();
        session.startTransaction();

        let generatedTickets = [];

        try {
            // A. ATOMIC INVENTORY DECREMENT (Must use session)
            const updatedEvent = await EVENTS.findOneAndUpdate(
                { 
                    "tickets._id": ticketId,
                    "tickets.quantityAvailable": { $gte: purchasedQuantity } // Lock
                },
                {
                    $inc: { "tickets.$.quantityAvailable": -purchasedQuantity } // Decrement
                },
                { new: true, session } 
            );

            if (!updatedEvent) {
                await session.abortTransaction(); 
                finalStatus = 'inventory_error';
                await paymentSchema.findOneAndUpdate({ reference }, { status: finalStatus, verificationData: data });
                return redirectToFrontend(res, finalStatus, reference);
            }

            // B. TICKET INSTANCE CREATION (Uses specificTicket from event)
           generatedTickets = await generateTicketInstances(
                payment,
                specificTicket, // Pass the ticket subdocument
                user,
                event,          // ⬅️ CRITICAL FIX: Pass the full event object
                session
            );

            // C. FINAL PAYMENT RECORD UPDATE (Must use session)
            payment.status = "success";
            payment.paidAt = new Date();
            payment.gatewayResponse = transactionResult.data;
            payment.ticketInstances = generatedTickets.map((t) => t._id); 
            await payment.save({ session }); 

            await session.commitTransaction(); 
            finalStatus = 'success'; 

        } catch (transactionError) {
            await session.abortTransaction(); 
            throw transactionError;
        } finally {
            session.endSession();
        }
        
        // --- POST-TRANSACTION ACTIONS (Emails & Response) ---
        // Accessing event and ticket data from the objects fetched before the transaction
        const emailTicketDetails = {
            eventName: event.title, // Use event title from the fetched object
            eventDate: event.startDate, // Use event start date
            ticketType: specificTicket.name,
            quantity: purchasedQuantity,
            pricePerTicket: specificTicket.price,
            generatedTickets: generatedTickets.map((t) => ({
                number: t.ticketNumber,
                token: t.ticketToken,
                qrCodeBase64:t.qrCode
            })),
        };
        const clientTicketSummary = {
            eventName: emailTicketDetails.eventName,
            eventDate: emailTicketDetails.eventDate,
            ticketType: emailTicketDetails.ticketType,
            quantity: emailTicketDetails.quantity,
            pricePerTicket: emailTicketDetails.pricePerTicket,
        };
        
        const currency = transactionResult.data.currency;

        try {
            const confirmationEmailPromise = sendPaymentConfirmationEmail({
            email: payment.email,
            lastname: user.lastname,
            reference: payment.reference,
            amount: payment.amount,
            currency: currency,
            status: payment.status,
            
            ticketDetails: emailTicketDetails,
            event: event.title
        });

        const ticketEmailPromise = sendTicket({
            email: payment.email,
            lastname:payment.lastname,
            account: user.email,
            amount: payment.amount,
            currency: currency,
            event: event,
            ticketDetails: emailTicketDetails,
            reference: reference,
        });

            await Promise.all([confirmationEmailPromise, ticketEmailPromise]);

        } catch (emailError) {
            // return redirectToFrontend(res, finalStatus, reference);
            console.error("One or more customer emails failed to send:", emailError);
        }

        return redirectToFrontend(res, 'success', reference, ticketId)
    } catch (error) {
        console.error("Payment verification error:", error); 
       const currentStatus = finalStatus === 'error' && payment ? payment.status : finalStatus;
        return redirectToFrontend(res, currentStatus, reference);
    }
};

// ... handleAllTransactions and handleUserTicket would need significant modification 
// to use aggregation ($lookup and $unwind) instead of population, 
// but the initial controllers are the priority.



const handleAllTransactions = async (req, res, next) => {
    try {
        const transactions = await paymentSchema.aggregate([
            // 1. Lookup User Details
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            
            // 2. Lookup Ticket Instances
            {
                $lookup: {
                    from: "ticketinstances", 
                    localField: "ticketInstances",
                    foreignField: "_id",
                    as: "ticketInstances"
                }
            },
            
            // 3. Lookup the Parent Event
           {
                $lookup: {
                    from: "eventras",
                    let: { eventId: "$event" }, // Capture the payment's event ID
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    // Cast the payment's event ID to ObjectId for a strict match
                                    $eq: ["$_id", { $toObjectId: "$$eventId" }] 
                                }
                            }
                        },
                        { $project: { _id: 1, title: 1, eventDate: 1, tickets: 1 } } // Project necessary fields
                    ],
                    as: "eventDetails"
                }
                },
                { $unwind: { path: "$eventDetails", preserveNullAndEmptyArrays: true } },

            // 4. Project and Filter (Extract the correct embedded ticket)
            {
                $project: {
                    _id: 1,
                    reference: 1,
                    amount: 1,
                    quantity: 1,
                    status: 1,
                    paidAt: 1,
                    createdAt: 1,
                    
                    user: {
                        _id: "$user._id",
                        firstname: "$user.firstname",
                        lastname: "$user.lastname",
                        email: "$user.email"
                    },

                    ticketInstances: {
                        $map: {
                            input: "$ticketInstances",
                            as: "t",
                            in: {
                                _id: "$$t._id",
                                ticketNumber: "$$t.ticketNumber",
                                ticketToken: "$$t.ticketToken",
                                qrCode: "$$t.qrCode"
                            }
                        }
                    },

                    // ⬅️ FIX APPLIED HERE: Use $toObjectId on the stored ID
                    ticketType: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$eventDetails.tickets",
                                    as: "ticket",
                                    cond: { 
                                        $eq: [
                                            "$$ticket._id", 
                                            { $toObjectId: "$ticket" } // Ensures type match
                                        ] 
                                    }
                                }
                            },
                            0
                        ]
                    },

                    event: {
                        _id: "$eventDetails._id",
                        title: "$eventDetails.title",
                        eventDate: "$eventDetails.startTime"
                    }
                }
            },
            
            // 5. Sort by creation date
            { $sort: { createdAt: -1 } }
        ]);

        res.status(200).json({
            status: "success",
            results: transactions.length,
            data: {
                transactions,
            },
        });
    } catch (error) {
        next(error);
    }
};

const handleUserTicket = async (req, res, next) => {
    // Robustly extract user ID from req.user
    const { _id: userId } = req.user;
    // Extract query parameters for search and filtering
    const { status, search } = req.query;

    try {
        let matchQuery = { user: userId };

        // 1. Status Filtering
        if (status) {
            matchQuery.status = status;
        }

        // 2. Text Search Filtering (Must use $or with existing matchQuery)
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            // Add search criteria to the $match stage
            matchQuery.$or = [
                { ticketNumber: { $regex: searchRegex } },
                { ticketToken: { $regex: searchRegex } },
                { attendeeName: { $regex: searchRegex } }
            ];
        }

        const userTickets = await ticketInstanceSchema.aggregate([
            // STAGE 1: Filter by User ID and Query Parameters
            { $match: matchQuery },
            
            // STAGE 2: Lookup Payment Details (reference, amount, quantity, etc.)
            {
                $lookup: {
                    from: "ticketpayments", // ⬅️ USE THE CORRECT PLURALIZED COLLECTION NAME
                    localField: "payment",
                    foreignField: "_id",
                    as: "paymentDetails"
                }
            },
            { $unwind: { path: "$paymentDetails", preserveNullAndEmptyArrays: true } },

            // STAGE 3: Lookup Parent Event Details
            {
                $lookup: {
                    from: "eventras", // ⬅️ USE THE CORRECT PLURALIZED COLLECTION NAME (from Eventra model)
                    localField: "event",
                    foreignField: "_id",
                    as: "eventDetails"
                }
            },
            { $unwind: { path: "$eventDetails", preserveNullAndEmptyArrays: true } },

            // STAGE 4: Lookup the Embedded Ticket Type Subdocument
            {
                $addFields: {
                    ticketTypeDetails: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$eventDetails.tickets",
                                    as: "ticket",
                                    // CRITICAL: Match the TicketInstance.ticketType ID with the embedded ticket's _id
                                    cond: { $eq: ["$$ticket._id", "$ticketType"] } 
                                }
                            },
                            0
                        ]
                    }
                }
            },

            // STAGE 5: Project the final output structure
            {
                $project: {
                    _id: 1,
                    ticketNumber: 1,
                    ticketToken: 1,
                    status: 1,
                    attendeeName: 1,
                    qrCode: 1,
                    attendeeEmail: 1,
                    createdAt: 1,
                    
                    // Event Fields
                    event: {
                        _id: "$eventDetails._id",
                        title: "$eventDetails.title",
                        eventDate: "$eventDetails.eventDate",
                        location: "$eventDetails.address", // ⬅️ NOTE: Using 'address' from EventSchema
                        category: "$eventDetails.category",
                        eventStart: "$eventDetails.startTime", // ⬅️ NOTE: Using 'startTime'
                        eventEnd: "$eventDetails.endTime", // ⬅️ NOTE: Using 'endTime'
                        eventImage: "$eventDetails.image", // ⬅️ NOTE: Using 'image'
                    },

                    // Ticket Type Fields (The one we fixed)
                    ticketType: {
                        _id: "$ticketTypeDetails._id",
                        name: "$ticketTypeDetails.name",
                        type: "$ticketTypeDetails.type",
                        price: "$ticketTypeDetails.price",
                    },

                    // Payment Fields
payment: {
            quantity: "$paymentDetails.quantity",
            amount: "$paymentDetails.amount",
            reference: "$paymentDetails.reference",
            paidAt: "$paymentDetails.paidAt",
            email: "$paymentDetails.email", // Include email if needed
            // NOTE: Ensure the keys match the fields in your payment schema
        },
                }
            },
            
            // STAGE 6: Sort
            { $sort: { createdAt: -1 } }
        ]);

        res.status(200).json({
            status: "success",
            results: userTickets.length,
            data: {
                tickets: userTickets, // Use the aggregated output directly
            },
        });
    } catch (error) {
        next(error);
    }
};

const handleAllTickets = async (req, res, next) => {
    // Extract query parameters for global search and filtering
    const { status, search } = req.query;

    try {
        let matchQuery = {}; // Start with an empty match query to find ALL tickets

        // 1. Status Filtering
        if (status) {
            matchQuery.status = status;
        }

        // 2. Text Search Filtering
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            // Check if matchQuery is empty to decide how to apply $or
            const searchCriteria = {
                $or: [
                    { ticketNumber: { $regex: searchRegex } },
                    { ticketToken: { $regex: searchRegex } },
                    { attendeeName: { $regex: searchRegex } }
                ]
            };
            
            // Merge status filter with search criteria if status exists
            matchQuery = Object.keys(matchQuery).length > 0 
                ? { ...matchQuery, ...searchCriteria }
                : searchCriteria;
        }

        const allTickets = await ticketInstanceSchema.aggregate([
            // STAGE 1: Filter by Query Parameters (Status/Search)
            { $match: matchQuery },
            
            // STAGE 2: Lookup USER Details (New for this 'All' endpoint)
            {
                $lookup: {
                    from: "users", // Assuming 'users' is the User collection name
                    localField: "user",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },

            // STAGE 3: Lookup Payment Details (reference, amount, quantity, etc.)
            {
                $lookup: {
                    from: "ticketpayments", 
                    localField: "payment",
                    foreignField: "_id",
                    as: "paymentDetails"
                }
            },
            { $unwind: { path: "$paymentDetails", preserveNullAndEmptyArrays: true } },

            // STAGE 4: Lookup Parent Event Details
            {
                $lookup: {
                    from: "eventras", // Eventra collection name
                    localField: "event",
                    foreignField: "_id",
                    as: "eventDetails"
                }
            },
            { $unwind: { path: "$eventDetails", preserveNullAndEmptyArrays: true } },

            // STAGE 5: Lookup the Embedded Ticket Type Subdocument
            {
                $addFields: {
                    ticketTypeDetails: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$eventDetails.tickets",
                                    as: "ticket",
                                    cond: { $eq: ["$$ticket._id", "$ticketType"] } 
                                }
                            },
                            0
                        ]
                    }
                }
            },

            // STAGE 6: Project the final output structure
            {
                $project: {
                    _id: 1,
                    ticketNumber: 1,
                    ticketToken: 1,
                    status: 1,
                    attendeeName: 1,
                    qrCode: 1,
                    attendeeEmail: 1,
                    createdAt: 1,
                    
                    // User Fields (ADDED)
                    user: {
                        _id: "$userDetails._id",
                        firstname: "$userDetails.firstname",
                        lastname: "$userDetails.lastname",
                        email: "$userDetails.email"
                    },

                    // Event Fields
                    event: {
                        _id: "$eventDetails._id",
                        title: "$eventDetails.title",
                        eventDate: "$eventDetails.eventDate",
                        location: "$eventDetails.address",
                        category: "$eventDetails.category",
                        eventStart: "$eventDetails.startTime",
                        eventEnd: "$eventDetails.endTime",
                        eventImage: "$eventDetails.image",
                    },

                    // Ticket Type Fields
                    ticketType: {
                        _id: "$ticketTypeDetails._id",
                        name: "$ticketTypeDetails.name",
                        type: "$ticketTypeDetails.type",
                        price: "$ticketTypeDetails.price",
                    },

                    // Payment Fields
                    payment: {
                        quantity: "$paymentDetails.quantity",
                        amount: "$paymentDetails.amount",
                        reference: "$paymentDetails.reference",
                        paidAt: "$paymentDetails.paidAt",
                        email: "$paymentDetails.email",
                    },
                }
            },
            
            // STAGE 7: Sort
            { $sort: { createdAt: -1 } }
        ]);

        res.status(200).json({
            status: "success",
            results: allTickets.length,
            data: {
                tickets: allTickets,
            },
        });
    } catch (error) {
        next(error);
    }
};


const getSalesOverview = async (req, res, next) => {
    try {
        // Calculate the date 30 days ago
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);


        // --- 1. Aggregate Total Revenue from Payments (Last 30 Days) ---
        const revenueResult = await paymentSchema.aggregate([
            {
                $match: {
                    status: "success", // Only successful payments
                    createdAt: { $gte: thirtyDaysAgo } // Filter by date (last 30 days)
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$amount" } // Sum the amount field
                }
            }
        ]);

        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

        // --- 2. Aggregate Total Tickets Sold (Last 30 Days) ---
        const ticketsResult = await ticketInstanceSchema.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo } // Filter by date (last 30 days)
                }
            },
            {
                $group: {
                    _id: null,
                    totalTicketsSold: { $sum: 1 } // Simply counts every document
                }
            }
        ]);

        const totalTicketsSold = ticketsResult.length > 0 ? ticketsResult[0].totalTicketsSold : 0;

        // --- 3. Aggregate Total Tickets Used (Last 30 Days) ---
        const usedTicketsResult = await ticketInstanceSchema.aggregate([
            {
                $match: {
                    status: "used", // Only used tickets
                    createdAt: { $gte: thirtyDaysAgo } // Filter by date (last 30 days)
                }
            },
            {
                $group: {
                    _id: null,
                    totalTicketsUsed: { $sum: 1 }
                }
            }
        ]);

        const totalTicketsUsed = usedTicketsResult.length > 0 ? usedTicketsResult[0].totalTicketsUsed : 0;


        res.status(200).json({
            status: 'success',
            data: {
                totalRevenue: totalRevenue,
                totalTicketsSold: totalTicketsSold,
                totalTicketsUsed: totalTicketsUsed, // Useful extra metric
            }
        });

    } catch (error) {
        console.error("Sales reporting error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error fetching sales overview.",
            error: error.message,
        });
        next(error);
    }
};

module.exports = {
  handlePaymentInitialization,
  handlePaymentVerification,
  handleAllTransactions,
  handleUserTicket,
  getSalesOverview, 
  handleAllTickets
};
