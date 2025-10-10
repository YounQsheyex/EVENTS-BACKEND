const crypto = require("crypto");
const {processSuccessfulPayment} = require("../helpers/verifyPaymentSuccess")
const {sendPaymentConfirmationEmail} = require("../emails/sendemails")


const handleWebhookNotification = async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const hash = crypto
    .createHmac("sha512", secret)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"]) {
    return res.status(401).json({
        success:"false",
        meassage:'"Invalid signature"'
    });
  }

  const { event, data } = req.body;

  try {
    if (event === "charge.success") {
      await processSuccessfulPayment(data.reference, data);
    }
   
    res.status(200).send("Webhook processed");

    
  } catch (error) {
     next(error)
  }
}

module.exports = {handleWebhookNotification}