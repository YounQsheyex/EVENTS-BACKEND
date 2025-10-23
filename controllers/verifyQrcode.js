const TicketInstance = require("../models/ticketIntanceSchema");

/**
 * Verify and update ticket status after QR scan.
 */
const verifyTicketScan = async (req, res,next) => {
    try {
        // --- FIX: Safely destructure req.body, defaulting to {} if undefined/null ---
        // This prevents the "Cannot destructure property 'event' of 'req.body' as it is undefined" crash.
        const { event: rawEvent, ticketNumber, token } = req.body || {};
        
        // Determine the actual event ID: check if it's an object (like the sample payload) or a string
        const eventId = (typeof rawEvent === 'object' && rawEvent !== null && rawEvent._id) 
            ? rawEvent._id 
            : rawEvent;
        // ------------------------------------

        if (!eventId || !ticketNumber || !token) {
            return res.status(400).json({
                success: false,
                status: "invalid",
                // Updated message to suggest a common root cause
                message: "Invalid QR payload. Missing required data. Ensure your server is using 'express.json()' middleware.",
            });
        }

        // 🔹 Find the ticket instance and populate related data for a richer response
        const ticket = await TicketInstance.findOne({
            ticketNumber,
            ticketToken: token,
            event: eventId, // FIX: Correct Mongoose query syntax
        })
        .populate('event', 'title') // Populate event title for context
        .populate('ticketType', 'type name'); // Populate ticket type name/details

        if (!ticket) {
            return res.status(404).json({
                success: false,
                status: "invalid",
                message: "Ticket not found or invalid.",
            });
        }

        // Prepare ticket details for all responses (populated fields will be objects)
        const ticketDetails = {
            ticketNumber: ticket.ticketNumber,
            attendeeName: ticket.attendeeName,
            eventTitle: ticket.event ? ticket.event.title : 'N/A',
            ticketTypeName: ticket.ticketType ? ticket.ticketType.name : 'N/A',
            scannedAt: ticket.metadata?.scannedAt,
        };


        // 🔹 Handle status logic: ALREADY USED
        if (ticket.status === "used") {
            return res.status(200).json({
                success: true,
                status: "used",
                message: "This ticket has already been used.",
                ticket: ticketDetails,
            });
        }

        // 🔹 Handle status logic: EXPIRED (or other non-valid status)
        if (ticket.status !== "valid") {
            // Catches 'expired', 'cancelled', or 'transferred' (if not implemented for use)
            return res.status(200).json({
                success: true,
                status: ticket.status,
                message: `This ticket is currently marked as ${ticket.status}.`,
                ticket: ticketDetails,
            });
        }

        // 🔹 Mark as used (VALID ticket)
        ticket.status = "used";
        ticket.usedAt = new Date(); // Set usedAt timestamp
        ticket.metadata = {
            ...ticket.metadata,
            scannedAt: ticket.usedAt,
            scannedBy: req.user?._id || "system", // Log who scanned it
        };
        await ticket.save();

        // 🔹 Success response (ADMIT)
        return res.status(200).json({
            success: true,
            status: "admitted",
            message: "Ticket verified successfully. Attendee admitted.",
            ticket: {
                ...ticketDetails,
                scannedAt: ticket.usedAt // Use the saved timestamp
            },
        });
    } catch (error) {
        console.error("Ticket verification error:", error);
        res.status(500).json({
            success: false,
            status: "error",
            message: "Internal server error verifying ticket.",
            error: error.message,
        });
        next(error) // Pass error to Express error handler
    }
};

module.exports = { verifyTicketScan };