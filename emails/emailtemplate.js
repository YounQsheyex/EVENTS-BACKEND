const createWelcomeEmail = (firstname, clientUrl) => {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script> -->
    <title>Welcome to Eventra</title>
  </head>
  <body
    style="
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    "
  >
    <main style="border: 1px solid #006f6a; border-radius: 10px">
      <div
        style="
          background-color: #045854;
          text-align: center;
          padding: 30px;
          border-radius: 10px 10px 0 0;
        "
      >
        <div
          style="display: flex; justify-content: center; align-items: center"
        >
          <img
            src="https://res.cloudinary.com/dgvucesc6/image/upload/Frame_2121455760_fj8zmx.png"
            alt="eventra"
             style="
            max-width: 700.3px;
            max-height: 43.92px;
            margin-bottom: 20px;
            border-radius: 5px;
          "
          />
        </div>
        <div
          style="
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
          "
        >
          <h1 style="font-size: 28px; color: white; font-weight: 700">
            Welcome to Eventra
          </h1>
        </div>
      </div>
      <div
        style="
          background-color: #9da5a4;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        "
      >
        <p style="font-size: 18px; color: #000">
          <strong>Hello ${firstname},</strong>
        </p>
        <p>We're thrilled to have you join us!</p>

        <div style="text-align: start; margin: 30px 0">
          <a
            href="${clientUrl}"
            target="_blank"
            style="
              background-color: #006f6a;
              color: white;
              padding: 14px 38px;
              text-decoration: none;
              border-radius: 10px;
              font-weight: bold;
              font-size: 16px;
              transition: background-color 0.3s;
            "
            >Verify your email</a
          >
        </div>
        <p style="margin-bottom: 5px">
          If you have any questions or need assistance, our support team is
          always here to help.
        </p>
        <p style="margin-bottom: 5px">Best regards,<br /></p>
        <img
          src="https://res.cloudinary.com/dgvucesc6/image/upload/Frame_2121455760_fj8zmx.png"
          alt=""
        />
      </div>
    </main>
  </body>
</html>


`;
};

const resetEmailTemplate = (firstname, clientUrl) => {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reset password</title>
  </head>
  <body
    style="
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    "
  >
    <div
      style="
        background-color: #045854;
        padding: 30px;
        text-align: center;
        border-radius: 10px 10px 0 0;
      "
    >
      <img
        src="https://res.cloudinary.com/dgvucesc6/image/upload/Frame_2121455760_fj8zmx.png"
          alt="eventra"
        style="
          max-width: 700.3px;
          max-height: 43.92px;
          margin-bottom: 20px;
          border-radius: 5px;
        "
      />

      <h1 style="color: white; margin: 0; font-size: 28px">Reset password!</h1>
    </div>
    <div
      style="
        background-color: #ffffff;
        padding: 30px;
        border-radius: 0 0 10px 10px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      "
    >
      <p style="font-size: 18px; color: #000000">
        <strong>Hello ${firstname},</strong>
      </p>
      <p>Forgot your password?</p>
      <div
        style="
          background-color: #f3f6f8;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        "
      >
        <h1>You have requested for a password reset from Eventra</h1>
        <p>Please go to this link to reset password</p>
        <a href="${clientUrl}" clicktracking="off" target="_blank">Click To Reset</a>
      </div>

      <p>
        If you have any questions or need assistance, our support team is always
        here to help.
      </p>
      <p>Best regards,<br />Eventra</p>
    </div>
  </body>
</html>`;
};


const contactEmailReply = (firstname) => {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Message Received</title>
  </head>
  <body
    style="
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    "
  >
    <main style="border: 1px solid #006f6a; border-radius: 10px">
      <div
        style="
          background-color: #045854;
          text-align: center;
          padding: 30px;
          border-radius: 10px 10px 0 0;
        "
      >
        <img
          src="https://res.cloudinary.com/dgvucesc6/image/upload/Frame_2121455760_fj8zmx.png"
          alt="Eventra Logo"
          style="max-width: 200px; margin-bottom: 20px; border-radius: 5px;"
        />
        <h1 style="font-size: 24px; color: white; font-weight: 700">
          We've received your message
        </h1>
      </div>
      <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 18px; color: #000;">
          <strong>Hi ${firstname || "there"},</strong>
        </p>
        <p>Thank you for reaching out to Eventra. Your message has been received successfully.</p>
        <p>Our support team will review it and get back to you as soon as possible.</p>
        <p style="margin-top: 20px;">Best regards,<br /><strong>The Eventra Team</strong></p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
        <p style="font-size: 12px; color: #666;">© ${new Date().getFullYear()} Eventra. All rights reserved.</p>
      </div>
    </main>
  </body>
</html>`;
};


module.exports = { createWelcomeEmail, resetEmailTemplate, contactEmailReply };
