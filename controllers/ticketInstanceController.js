// ===== 2. TICKET GENERATION HELPER =====
// helpers/generateTickets.js
const TicketInstance = require('../models/ticketInstanceSchema');


const generateTicketInstances = async (payment, ticket, user,session) => {
    const ticketInstances = [];
    const quantity = payment.quantity;


    for (let i = 0; i < quantity; i++) {
        // Generate unique ticket number (e.g., EVT-2025-ABCD1234-01)
        const ticketNumber = generateTicketNumber(payment.reference, i + 1);
        
        // Generate secure token for verification
        const ticketToken = generateSecureToken();
        

        const ticketInstance = await TicketInstance.create({
            payment: payment._id,
            user: user._id,
            ticketType: ticket._id,
            ticketNumber: ticketNumber,
            ticketToken: ticketToken,
            event: payment.event._id,
            // qrCode: qrCodeData,
            attendeeName: `${payment.firstname} ${payment.lastname}`,
            attendeeEmail: user.email,
            status: 'valid',
            eventName: ticket.eventName || ticket.event,
            eventDate: ticket.eventDate,
            eventLocation: ticket.location,
            metadata: {
                purchaseDate: payment.paidAt,
                price: ticket.price,
                ticketType: ticket.type,
                orderReference: payment.reference
            }
        });

        ticketInstances.push(ticketInstance);
    }

    return ticketInstances;
};

/**
 * Generate unique ticket number
 */
const generateTicketNumber = (reference, sequenceNumber) => {
    const year = new Date().getFullYear();
    const randomPart = reference.split('_')[1] || Date.now();
    const formattedSequence = String(sequenceNumber).padStart(2, '0');
    
    return `EVT-${year}-${randomPart.slice(-8).toUpperCase()}-${formattedSequence}`;
};

/**
 * Generate secure token for ticket verification
 */
const generateSecureToken = () => {
    return crypto.randomBytes(32).toString('hex');
};


module.exports = {
    generateTicketInstances,
    generateTicketNumber,
    generateSecureToken,
}