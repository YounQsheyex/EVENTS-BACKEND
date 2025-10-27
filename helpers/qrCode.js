const QRCode = require("qrcode")

const generateQrCode = async ({ event, ticketNumber, token }) => {
    // Destructure token from the input object
    if (!token) {
        throw new Error("Token is required for QR code generation.");
    }
     const eventId = event?.id || event?._id || event;
    try {
        // 🔹 STEP 1: Create secure payload as JSON string
        const qrPayload = JSON.stringify({
            event: eventId.toString(),
            ticketNumber: ticketNumber, 
            token: token 
        });

        // 🔹 STEP 2: Generate QR code (Base64)
        const qrCodeData = await QRCode.toDataURL(qrPayload, {
            errorCorrectionLevel: 'H', // high correction for scanning reliability
            width: 300,
            margin: 2,
            type: 'image/png',
            color: {
                dark: '#000000', // Black modules
                light: '#FFFFFF' // White background
            }
        });

        return qrCodeData; // Missing return added

    } catch (error) {
        console.error("Error generating QR code:", error);
        // Fallback for failure: Return an empty string
        return "";
    }
};

module.exports = generateQrCode;