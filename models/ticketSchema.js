const mongoose = require("mongoose");

//  Ticket schema
const TicketSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Events",
        // required: [true, "Please provide the event ID."],
        unique:[true, "ticket already exist for this event"]
    },

    name:{
        type:String,
        required:true,
    },

    price: {
        type:Number,
        required: [true,"please enter ticket prices"],
    },
    type:{
        type:String,
        enum:["free","paid"],
        required:[true, "select ticket type"],
        default:"free"
    },

    maxTicketPerOrder:{
        type:Number,
    },
    
    quantity: {
    type: Number,
    required: [true,"ticket available quantity is required"],
    default: 0
  },
    status: {
        type: String,
        enum: ["available", "sold out"],
        default: "available",
        required:[true,"ticket status is required"],
    },
    // eventStatus:{type:string}
 }, { timestamps: true });

module.exports = mongoose.model("ticket", TicketSchema);
