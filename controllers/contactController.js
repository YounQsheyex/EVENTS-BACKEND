const nodemailer = require("nodemailer");
const { contactEmailReply } = require("../emails/emailtemplate");


exports.handleContactForm = async (req, res) => {
    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD,
            },
        });

        await transporter.sendMail({
            from: email,
            to: process.env.ADMIN_EMAIL || process.env.EMAIL,
            subject: `📩 New Contact Form Message from ${name}`,
            html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong> ${message}</p>
      `,
        });

        await transporter.sendMail({
            from: process.env.EMAIL,
            to: email,
            subject: " Message Received",
            html: contactEmailReply(name),
        });

        res.status(200).json({ success: true, message: "Message sent successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to send message" });
    }
};
