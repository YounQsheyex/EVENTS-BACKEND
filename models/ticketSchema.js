const mongoose = require("mongoose");

//  Ticket schema
const TicketSchema = new mongoose.Schema({
    price: {
        type: Number,
        required: [true,"please ticket prices"],
        unique: [true,"Please enter a unique ticket price"]
    },
    type:{
        type:String,
        enum:["regular", "vip", "vvip"],
        required:[true, "select ticket type"]
    },
    eventId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Events",
        require:true
    }
}, { timestamps: true });

module.exports = TicketSchema;
