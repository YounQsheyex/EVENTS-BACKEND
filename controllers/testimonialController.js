const Testimonial = require("../models/Testimonial.js")


const createTestimonial = async (req, res) => {
    try {
        const { name, message, rating, city } = req.body;

        const testimonial = await Testimonial.create({
            name,
            message,
            rating,
            city,
            user: req.user?._id,
        });

        res.status(201).json({
            success: true,
            data: testimonial,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


const getTestimonials = async (req, res) => {
    try {
        const testimonials = await Testimonial.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: testimonials,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


const deleteTestimonial = async (req, res) => {
    try {
        const testimonial = await Testimonial.findByIdAndDelete(req.params.id);

        if (!testimonial)
            return res.status(404).json({ success: false, message: "Not found" });

        res.status(200).json({ success: true, message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


module.exports = {
    createTestimonial,
    getTestimonials,
    deleteTestimonial,
};