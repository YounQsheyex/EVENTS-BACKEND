const nodemailer = require("nodemailer");
const { createWelcomeEmail } = require("./googlemailtemplate");

const sendGoogleWelcomeEmail = async ({ firstname, email }) => {
    // Configure mail transporter
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD,
        },
    });

    try {
        const subject = "Welcome to Eventra!!";

        // Generate the email template for Google signup
        const html = createWelcomeEmail(firstname, process.env.FRONTEND_URL);

        // Send the email
        const info = await transporter.sendMail({
            from: `"Eventra" <${process.env.EMAIL}>`,
            to: email,
            subject,
            html,
        });

        console.log(`Google welcome email sent to ${email}: ${info.response}`);
    } catch (error) {
        console.error("Error sending Google welcome email:", error);
    }
};

module.exports = {
    sendGoogleWelcomeEmail,
};
