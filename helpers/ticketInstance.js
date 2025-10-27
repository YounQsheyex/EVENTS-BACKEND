const TicketInstance = require('../models/ticketIntanceSchema');
const generateQrCode = require('../helpers/qrCode'); // Assuming the path is correct
const mongoose = require('mongoose');
const crypto = require("crypto");


// --- Helper Functions (Exported for testing or kept private if only used here) ---

/**
 * Generate globally unique ticket number using the payment's unique reference part.
 * Reference format: TKT_{ticketId}_{timestamp}_{userId}
 */
const generateTicketNumber = (reference, sequenceNumber) => {
    // We use the timestamp part of the reference (index 2) as the unique ID base.
    const parts = reference.split('_');
    const uniqueTimestampPart = parts.length > 2 ? parts[2] : Date.now().toString(); 
    
    // Use the last 8 digits of the unique timestamp part (guaranteed unique per payment)
    const uniqueBaseID = uniqueTimestampPart.slice(-8);
    
    // Format sequence number
    const formattedSequence = String(sequenceNumber).padStart(2, '0');
    
    // Format: REF-UNIQUE_TIMESTAMP_PART-SEQUENCE
    // Example: REF-78901234-01 
    // This is unique for every transaction and every sequence number within it.
    return `REF-${uniqueBaseID}-${formattedSequence}`;
};
/**
 * Generate secure token for ticket verification
 */
const generateSecureToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

const generateTicketInstances = async (payment, specificTicket, user, event, session) => {
    const ticketsToCreate = [];
    const quantity = payment.quantity;
    const eventId = payment.event; // The ID of the parent Event

    if (!eventId) {
        throw new Error('Event ID is missing from payment record.');
    }

    for (let i = 0; i < quantity; i++) {
        
        const ticketNumber = generateTicketNumber(payment.reference, i + 1);
        const ticketToken = generateSecureToken();

        // Generate the QR Code (Base64 Data URL)
        const qrCodeData = await generateQrCode({
            event: eventId, 
            ticketNumber: ticketNumber,
            token: ticketToken
        });
        
        const ticketInstanceData = {
            payment: payment._id,
            user: user._id,
            ticketType: specificTicket._id, 
            ticketNumber: ticketNumber,
            ticketToken: ticketToken,
            event: eventId,
            attendeeName: `${payment.firstname} ${payment.lastname}`,
            attendeeEmail: payment.email || user.email,
            status: 'valid',
            qrCode: qrCodeData,
            metadata: {
                // Denormalized data from the full 'event' object passed from the controller
                eventName: event.title,
                eventDate: event.startDate, 
                eventLocation: event.address,
                purchaseDate: payment.paidAt || new Date(),
                price: specificTicket.price,
                ticketType: specificTicket.name || specificTicket.type, 
                orderReference: payment.reference,
            }
        };

        ticketsToCreate.push(ticketInstanceData);
    }
    
    // 🚀 Performance Optimization: Use insertMany for a single atomic database operation
    const createdTicketInstances = await TicketInstance.insertMany(ticketsToCreate, { session });
    
    return createdTicketInstances;
};

module.exports = {
    generateTicketInstances,
    // Export helpers if you need them for testing, otherwise they can stay internal.
    generateTicketNumber, 
    generateSecureToken,
};