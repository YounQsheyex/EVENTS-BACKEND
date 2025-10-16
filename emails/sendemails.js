const nodemailer = require("nodemailer");
const {
  createWelcomeEmail,
  resetEmailTemplate,
  PaymentComfirmationEmail,
} = require("./emailtemplate");
const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
  const msg = {
    to,
    from: process.env.EMAIL, // must be a verified sender in SendGrid
    subject,
    html,
  };

  try {
    const info = await sgMail.send(msg);
    console.log(`Email sent successfully: ${info[0].statusCode}`);
  } catch (error) {
    console.error("Error sending email:", error);
    if (error.response) {
      console.error(error.response.body);
    }
  }
};

// const sendEmail = async ({ to, subject, html }) => {
//   const transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//       user: process.env.EMAIL,
//       pass: process.env.PASSWORD,
//     },
//   });
//   try {
//     const info = await transporter.sendMail({
//       from: process.env.EMAIL,
//       to: to,
//       subject: subject,
//       html: html,
//     });
//     console.log(`email sent ${info.response} `);
//   } catch (error) {
//     console.log(error);
//   }
// };

const sendWelcomeEmail = async ({ firstname, clientUrl, email }) => {
  const subject = "Welcome to Eventra";
  const html = createWelcomeEmail(firstname, clientUrl);

  sendEmail({
    to: email,
    subject,
    html,
  });
};

const sendResetEmail = async ({ firstname, clientUrl, email }) => {
  const subject = "Password Reset";
  const html = resetEmailTemplate(firstname, clientUrl);
  sendEmail({
    to: email,
    subject,
    html,
  });
};

const sendPaymentConfirmationEmail = async ({
  email,
  firstname,
  reference,
  amount,
  currency,
  ticketDetails,
}) => {
  const subject = "Your Purchase Confirmation & Ticket Details";
  const html = PaymentComfirmationEmail(
    firstname,
    reference,
    amount,
    currency,
    ticketDetails
  );

  sendEmail({
    to: email,
    subject,
    html,
  });
};

module.exports = {
  sendWelcomeEmail,
  sendResetEmail,
  sendPaymentConfirmationEmail,
};
