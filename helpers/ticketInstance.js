const TicketInstance = require('../models/ticketIntanceSchema');
const generateQrCode = require('../helpers/qrCode');
const mongoose = require('mongoose');
const crypto = require("crypto")


// --- UPDATED SIGNATURE: Accept 'event' object ---
const generateTicketInstances = async (payment, ticket, user, event, session) => {
    const ticketsToCreate = [];
    const quantity = payment.quantity;

    // We can rely on payment.event or event._id for the ID
    let eventId = event._id || payment.event; 
    
    // Safety check (already done in controller, but good practice)
    if (typeof eventId === 'string') {
        eventId = new mongoose.Types.ObjectId(eventId);
    }
    
    if (!eventId) {
        throw new Error('Event ID is required to generate ticket instances');
    }

    // Move helper functions inside or ensure they are imported/exported correctly
    const generateTicketNumber = (reference, sequenceNumber) => {
        const parts = reference.split('_');
        const uniqueBaseID = parts.length > 2 ? parts[2] : Date.now(); 
        const year = new Date().getFullYear();
        const formattedSequence = String(sequenceNumber).padStart(2, '0');
        return `REF-${year}-${uniqueBaseID}-${formattedSequence}`;
    };
    
    const generateSecureToken = () => {
        return crypto.randomBytes(32).toString('hex');
    };


    for (let i = 0; i < quantity; i++) {
        
        const ticketNumber = generateTicketNumber(payment.reference, i + 1);
        const ticketToken = generateSecureToken();

        // ⬅️ CRITICAL FIX: Pass only necessary data to QR code generation
        const qrCodeData = await generateQrCode({
            event: eventId, 
            ticketNumber: ticketNumber,
            token: ticketToken
        });
        
        // ⬅️ CRITICAL FIX: Use the passed 'event' object for metadata
        const ticketInstanceData = {
            payment: payment._id,
            user: user._id,
            ticketType: ticket._id, // The subdocument's ID
            ticketNumber: ticketNumber,
            ticketToken: ticketToken,
            event: eventId,
            attendeeName: `${payment.firstname} ${payment.lastname}`,
            attendeeEmail: payment.email || user.email, // Use payment email if provided
            status: 'valid',
            qrCode: qrCodeData,
            metadata: {
                purchaseDate: payment.paidAt,
                price: ticket.price,
                ticketType: ticket.name || ticket.type, // Use name/type from subdocument
                orderReference: payment.reference,
                eventName: event.title, // ⬅️ FIX: Access title from the passed 'event' object
                eventDate: event.startDate, // ⬅️ FIX: Access date from the passed 'event' object
                eventLocation: event.location // ⬅️ FIX: Access location from the passed 'event' object
            }
        };

        ticketsToCreate.push(ticketInstanceData);
    }
    
    const createdTicketInstances = await TicketInstance.insertMany(ticketsToCreate, { session });
    
    return createdTicketInstances;
};

// Removed the separate export of generateTicketNumber and generateSecureToken 
// since they are now helpers internal to the main function,
// but they could be exported if needed elsewhere.

module.exports = {
    generateTicketInstances,
};