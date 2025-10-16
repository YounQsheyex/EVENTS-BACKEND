const TicketInstance = require('../models/ticketIntanceSchema');
const mongoose = require('mongoose');
const crypto = require("crypto")

// --- CRITICAL CHANGE: Accept 'session' as the fourth argument ---
const generateTicketInstances = async (payment, ticket, user, session) => {
    const ticketsToCreate = [];
    const quantity = payment.quantity;

        // Extract event ID with proper fallbacks
    let eventId = payment.event?._id || payment.event || ticket.event?._id || ticket.event;
    
    // Convert to ObjectId if it's a string
    if (typeof eventId === 'string') {
        eventId = new mongoose.Types.ObjectId(eventId);
    }
    
    console.log("=== generateTicketInstances Debug ===");
    console.log("eventId:", eventId);
    console.log("eventId type:", typeof eventId);
    console.log("Is ObjectId:", eventId instanceof mongoose.Types.ObjectId);
    console.log("===================================");
    
    if (!eventId) {
        throw new Error('Event ID is required to generate ticket instances');
    }


    // We do NOT use .create() inside the loop for performance/atomicity.
    for (let i = 0; i < quantity; i++) {
        
        // --- FIX 1: The correct signature and logic for unique number ---
        const ticketNumber = generateTicketNumber(payment.reference, i + 1);
        
        // Generate secure token for verification (no change needed here)
        const ticketToken = generateSecureToken();
        
        const ticketInstanceData = {
            payment: payment._id,
            user: user._id,
            ticketType: ticket._id,
            ticketNumber: ticketNumber,
            ticketToken: ticketToken,
            event: eventId,
            attendeeName: `${payment.firstname} ${payment.lastname}`,
            attendeeEmail: user.email,
            status: 'valid',
            // eventName: ticket.event.title  || ticket.event ,
            // eventDate: ticket.event.eventDate,
            // eventLocation: ticket.event.location, // Assuming 'location' field exists on ticket model
            metadata: {
                purchaseDate: payment.paidAt,
                price: ticket.price,
                ticketType: ticket.type,
                orderReference: payment.reference,
                eventName: ticket.event?.title || 'Event',
                eventDate: ticket.event?.eventDate,
                eventLocation: ticket.event?.location
            }
        };

          console.log("Ticket instance data:", JSON.stringify(ticketInstanceData, null, 2));
        ticketsToCreate.push(ticketInstanceData);

    }
    
    // --- CRITICAL CHANGE: Use insertMany with the session ---
    const createdTicketInstances = await TicketInstance.insertMany(ticketsToCreate, { session });
    
    console.log(`Successfully created ${createdTicketInstances.length} ticket instances`);
    return createdTicketInstances;
};

/**
 * Generate unique ticket number using the payment's unique timestamp.
 */
const generateTicketNumber = (reference, sequenceNumber) => {
    const parts = reference.split('_');
    
    // The timestamp is the unique part, which is the 3rd element (index 2) of the reference
    // Fallback to Date.now() if the reference format is unexpected
    const uniqueBaseID = parts.length > 2 ? parts[2] : Date.now(); 
    
    const year = new Date().getFullYear();
    const formattedSequence = String(sequenceNumber).padStart(2, '0');
    
    // Format: REF-2025-{UNIQUE_TIMESTAMP}-01
    return `REF-${year}-${uniqueBaseID}-${formattedSequence}`;
};

/**
 * Generate secure token for ticket verification
 */
const generateSecureToken = () => {
    // Assuming 'crypto' is correctly imported and is the Node.js built-in module
    return crypto.randomBytes(32).toString('hex');
};


module.exports = {
    generateTicketInstances,
    generateTicketNumber,
    generateSecureToken,
};