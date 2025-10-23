const paymentSchema = require("../models/paymentSchema");
const mongoose = require("mongoose");
const ticketSchema = require("../models/ticketSchema");
const userSchema = require("../models/usersSchema");
const EVENTS  = require("../models/eventsSchemaa");
const ticketInstanceSchema = require("../models/ticketIntanceSchema");
const paystack = require("paystack")(process.env.PAYSTACK_SECRET_KEY);
// const { processSuccessfulPayment } = require("../helpers/verifyPaymentSuccess");
const {
  sendPaymentConfirmationEmail,
  sendVerifyPaymentlink,
} = require("../emails/sendemails");
const { generateTicketInstances } = require("../helpers/ticketInstance");

const baseUrl = process.env.BACKEND_URL.replace(/\/$/, "");

const handlePaymentInitialization = async (req, res, next) => {
  const { quantity: Quantity, firstname, lastname } = req.body;
  const { ticketId } = req.params;
  const { _id: userId, email } = req.user;

  if (!ticketId || !Quantity || !firstname || !lastname) {
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
    console.log(mongoose.modelNames()); // Fetch ticket and populate the event with only the title and eventDate fields
    const ticket = await ticketSchema.findById(ticketId).populate({
      path: "event",
      select: "title eventDate _id", // Select the fields we need
    });

    if (
      !ticket ||
      ticket.status === "sold out" ||
      ticket.status === "unavailable"
    ) {
      return res.status(404).json({
        success: "fail",
        message: "Ticket not available or sold out",
      });
    } // --- NEW CHECK: Validate against maxOrder limit ---

    if (requestedQuantity > ticket.maxOrder) {
      return res.status(400).json({
        success: "fail",
        message: `You cannot order more than ${ticket.maxOrder} tickets per transaction.`,
      });
    } // ---------------------------------------------------- // Check if enough quantity is available
    if (ticket.quantity < requestedQuantity) {
      return res.status(400).json({
        success: "fail",
        message: `Only ${ticket.quantity} of ${ticket.type} tickets are available.`,
      });
    } // Calculate total amount

    const totalAmount = ticket.price * requestedQuantity; // Generate secure reference // added userid incase i forget
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

    const payment = await paymentSchema.create({
      user: userId,
      firstname: firstname,
      lastname: lastname,
      ticket: ticketId,
      reference,
      amount: totalAmount,
      quantity: requestedQuantity,
      status: "pending",
    }); // setImmediate(async () => { //     try { //         await sendVerifyPaymentlink({ //             email: email, //             lastname: sanitizedLastname, //             reference: reference, //             amount: totalAmount, //             status: "pending", //             currency: "NGN", //             ticketDetails: { //                 eventName: ticket.eventName || ticket.event || 'Event', //                 ticketType: ticket.type, //                 quantity: requestedQuantity, //                 pricePerTicket: ticket.price //             }, //             verificationLink: confirmationLink //         }); //     } catch (emailError) { //         console.error("Failed to send payment link email:", emailError); //         // TODO: Add to retry queue //     } // });

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

  if (!reference) {
    return res.status(400).json({
      success: "fail",
      message: "Invalid payment reference",
    });
  }

  try {
    // Verify transaction with Paystack
    const transactionResult = await paystack.transaction.verify(reference); // console.log("Paystack verification:", transactionResult); // FIX: Added checks for transactionResult and transactionResult.data to prevent // "Cannot read properties of null (reading 'status')" if Paystack returns a malformed or empty response.
    if (
      !transactionResult ||
      !transactionResult.data ||
      transactionResult.data.status !== "success"
    ) {
      const paystackMessage = transactionResult
        ? transactionResult.message || "Transaction failed or pending"
        : "Paystack returned an invalid response structure.";

      return res.status(400).json({
        status: "fail",
        message: paystackMessage,
      });
    } // Find payment record // trying the find and update block to

    const payment = await paymentSchema.findOneAndUpdate(
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
      return res.status(404).json({
        status: "fail",
        message: "Payment record not found for this reference.",
      });
    } // PREVENT DOUBLE PROCESSING
    if (payment.status === "success") {
      // In a real app, you would look up the generated ticket instances here
      return res.status(200).json({
        status: "success",
        message: "Transaction already verified and processed.",
        data: {
          reference: payment.reference, // ... other data
        },
      });
    } // --- FETCH NECESSARY DATA --- // UPDATED: Populate the event details when fetching the ticket

    const ticket = await ticketSchema.findById(payment.ticket).populate({
      path: "event",
      select: "title eventDate _id location",
    });

    const user = await userSchema.findById(payment.user);
    //  console.log('TICKET EVENT VALUE:', ticket.event?._id || ticket.event);
    //  console.log(" Using event for ticket instance:", payment.event?._id || payment.event)
    //         console.log({user:user})
    //         console.log({ticket:ticket})

    if (!ticket || !user) {
      // Handle missing data - critical error
      return res
        .status(404)
        .json({ status: "fail", message: "Ticket or User data missing." });
    }
    const purchasedQuantity = payment.quantity; // Start session for atomic operations

    const session = await mongoose.startSession();
    let generatedTickets = [];

    try {
      await session.startTransaction(); // 1. Inventory Check & Update

      if (ticket.quantity >= purchasedQuantity) {
        ticket.quantity -= purchasedQuantity;
        if (ticket.quantity === 0) {
          ticket.status = "sold out";
        }
        await ticket.save({ session });
      } else {
        // Inventory Over-Sale - ABORT TRANSACTION
        await session.abortTransaction(); // It might be better to throw a specific error that leads to a refund process // Or a retry if a concurrent request just updated the inventory.
        const error = new Error("Inventory oversold for this ticket.");
        error.statusCode = 409; // Conflict
        throw error;
      }

      // Ensure payment has event before creating ticket instances
      if (!payment.event && ticket.event) {
        payment.event = ticket.event._id || ticket.event;
        await payment.save({ session });
      } // 2. Generate Ticket Instances (CRITICAL FIX: SESSION PASSED)

      // console.log(" Using event for ticket instance:", payment.event._id)

      generatedTickets = await generateTicketInstances(
        payment,
        ticket,
        user,
        session
      ); // 3. Update Payment Status
      //             console.log(`Generated ${generatedTickets.length} ticket instances.`);

      payment.status = "success";
      payment.paidAt = new Date();
      payment.gatewayResponse = transactionResult.data;
      payment.ticketInstances = generatedTickets.map((t) => t._id);
      await payment.save({ session }); // Commit the transaction only after ALL operations are successful

      await session.commitTransaction(); // --- POST-TRANSACTION ACTIONS (Emails) ---

      const customerEmail = user.email;
      const customerName = payment.lastname || payment.firstname || "Customer";
      const amount = payment.amount / 100;
      const currency = transactionResult.data.currency; // This object contains the full list of generated tickets, suitable for the email template

      const emailTicketDetails = {
        eventName: ticket.event ? ticket.event.title : "Event", // Use populated event title
        eventDate: ticket.event ? ticket.event.eventDate : undefined, // Use populated event date
        ticketType: ticket.type,
        quantity: purchasedQuantity,
        pricePerTicket: ticket.price,
        generatedTickets: generatedTickets.map((t) => ({
          number: t.ticketNumber,
          token: t.ticketToken,
        })),
      }; // This is the clean summary object for the final API response
      const clientTicketSummary = {
        eventName: emailTicketDetails.eventName,
        eventDate: emailTicketDetails.eventDate,
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
          ticketDetails: emailTicketDetails, // Pass the full object for the email template
        });
      } catch (emailError) {
        res
          .status(200)
          .json({
            success: "false",
            message:
              "Failed to send confirmation email but payment was successful",
          });
        console.error("Failed to send confirmation email:", emailError);
      } // --- FINAL SUCCESS RESPONSE ---

      res.status(200).json({
        status: "success",
        message: "Transaction verified and tickets generated successfully",
        data: {
          reference: payment.reference,
          amount: payment.amount,
          currency: currency,
          status: payment.status,
          paidAt: payment.paidAt, // FIX: Use the summary object without the duplicated ticket list
          ticketDetails: clientTicketSummary, // This is the clean, single list of tickets for the client
          tickets: generatedTickets.map((t) => ({
            _id: t._id,
            number: t.ticketNumber,
            token: t.ticketToken,
          })),
        },
      });
    } catch (transactionError) {
      await session.abortTransaction(); // Important: Propagate the error up
      throw transactionError;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error("Payment verification error:", error); // This ensures the error is correctly handled by Express error handler
    next(error);
  }
};

const handleAllTransactions = async (req, res, next) => {
  // Robustly extract user ID from req.user (which holds the Mongoose document)

  try {
    // Use the renamed Payment model
    const transactions = await paymentSchema
      .find()
      .populate("user", "firstname lastname email") // UPDATED: Nested population to get event details (title, eventDate)
      .populate({
        path: "ticket",
        select: "quantity type price event status", // Removed eventName
        populate: {
          path: "event",
          select: "title eventDate",
        },
      })
      .populate("ticketInstances", "ticketToken ticketNumber qrCode")
      .sort({ createdAt: -1 }); // Most recent first

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
  // Robustly extract user ID from req.user (which holds the Mongoose document)
  const { _id: userId } = req.user;
  // Extract query parameters for search and filtering
  const { status, search } = req.query;

  try {
    // Start building the query object with the mandatory user ID filter
    let findQuery = { user: userId };

    // 1. Add Status Filtering: Allows querying like /api/tickets?status=used
    if (status) {
      findQuery.status = status;
    }

    // 2. Add Text Search Filtering: Allows querying like /api/tickets?search=VIP
    if (search) {
      // Case-insensitive regex search
      const searchRegex = new RegExp(search, 'i');
      
      // Use $or to search across fields directly on the TicketInstance document
      findQuery.$or = [
        // Search by ticket number
        { ticketNumber: { $regex: searchRegex } },
        // Search by ticket token
        { ticketToken: { $regex: searchRegex } },
        // Search by attendee name
        { attendeeName: { $regex: searchRegex } }
      ];
    }

    // Assuming your TicketInstance schema is named 'ticketInstanceSchema'
    const userTickets = await ticketInstanceSchema
      .find(findQuery) // Use the dynamic query object
      .populate({
        path: "ticketType",
        select: "type name price quantity event",
        populate: {
          path: "event",
          select: "title eventDate location category eventStart eventEnd eventImage", // Select all needed event fields
        },
      })
      .populate({
        path: "payment",
        select: "quantity amount reference paidAt", // Add payment details including quantity
      })

      .select("ticketNumber ticketToken status attendeeName qrCode attendeeEmail createdAt") // Select all relevant fields
      .sort({ createdAt: -1 });

    const formattedTickets = userTickets.map((ticket) => ({
      _id: ticket._id,
      ticketNumber: ticket.ticketNumber,
      ticketToken: ticket.ticketToken,
      status: ticket.status,
      attendeeName: ticket.attendeeName,
      qrCode: ticket.qrCode,
      attendeeEmail: ticket.attendeeEmail,
      createdAt: ticket.createdAt,
     

      // Event details from populated data
      event: ticket.ticketType?.event
        ? {
            _id: ticket.ticketType.event._id,
            title: ticket.ticketType.event.title,
            eventDate: ticket.ticketType.event.eventDate,
            location: ticket.ticketType.event.location,
            eventStart: ticket.ticketType.event.eventStart,
            eventEnd: ticket.ticketType.event.eventEnd,
            eventImage: ticket.ticketType.event.eventImage,
            category: ticket.ticketType.event.category,
          }
        : null,

      // Ticket type details
      ticketType: ticket.ticketType
        ? {
            _id: ticket.ticketType._id,
            name: ticket.ticketType.name,
            type: ticket.ticketType.type,
            price: ticket.ticketType.price,
          }
        : null,

      // Payment details (including quantity purchased)
      payment: ticket.payment
        ? {
            quantity: ticket.payment.quantity,
            amount: ticket.payment.amount,
            reference: ticket.payment.reference,
            paidAt: ticket.payment.paidAt,
          }
        : null,
    }));

    res.status(200).json({
      status: "success",
      results: formattedTickets.length,
      data: {
        tickets: formattedTickets,
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
};
