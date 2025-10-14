const express = require("express");
const {
    createTestimonial,
    getTestimonials,
    deleteTestimonial,
} = require("../controllers/testimonialController.js")

const router = express.Router();


router.get("/", getTestimonials);
router.post("/create", createTestimonial);


router.delete("/:id", deleteTestimonial);

module.exports = router;
