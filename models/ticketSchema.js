const mongoose = require("mongoose");

//  Ticket schema
const TicketSchema = new mongoose.Schema({
    price: {
        type: Number,
        required: [true,"please enter ticket prices"],
    },
    type:{
        type:String,
        enum:["regular", "vip", "vvip"],
        required:[true, "select ticket type"]
    },
    eventId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Events",
        required:[true,"Please provide the eventId"],
        unique:true
    }
}, { timestamps: true });

module.exports = mongoose.model("ticket", TicketSchema);
