const router = require("express").Router()
const {handleWebhookNotification}=require("../controllers/webhookController")

router.post("/webhooks", handleWebhookNotification)

module.exports = router