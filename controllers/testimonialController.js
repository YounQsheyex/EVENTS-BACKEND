const Testimonial = require("../models/Testimonial.js")
const cloudinary = require("cloudinary").v2;


const createTestimonial = async (req, res) => {
    try {
        const { name, message, rating, city } = req.body;

        let imageUrl = null;

        if (req.files && req.files.image) {
            const result = await cloudinary.uploader.upload(req.files.image.tempFilePath, {
                folder: "testimonials",
            });
            imageUrl = result.secure_url;
        }

        const testimonial = await Testimonial.create({
            name,
            message,
            rating,
            city,
            image: imageUrl,
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
        const testimonial = await Testimonial.findById(req.params.id);

        if (!testimonial) {
            return res.status(404).json({ success: false, message: "Not found" });
        }

        if (testimonial.image) {
            const publicId = testimonial.image.split("/").slice(-1)[0].split(".")[0];
            await cloudinary.uploader.destroy(`testimonials/${publicId}`);
        }

        await testimonial.deleteOne();
        res.status(200).json({ success: true, message: "Deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};



module.exports = {
    createTestimonial,
    getTestimonials,
    deleteTestimonial,
};