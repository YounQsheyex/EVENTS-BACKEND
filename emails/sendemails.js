const nodemailer = require("nodemailer");
const { createWelcomeEmail, resetEmailTemplate } = require("./emailtemplate");

const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL,
      to: to,
      subject: subject,
      html: html,
    });
    console.log(`email sent ${info.response} `);
  } catch (error) {
    console.log(error);
  }
};

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
module.exports = { sendWelcomeEmail, sendResetEmail };
