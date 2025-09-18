require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const fileupload = require("express-fileupload");
const passport = require("passport");
const session = require("express-session");
const PORT = process.env.PORT || 5500;

require("./config/passport");

const cloudinary = require("cloudinary").v2;

const userRoutes = require("./routes/userRoutes");
const eventRoutes = require("./routes/eventRoutes");
const googleRoutes = require("./routes/googleRoutes");


// middleware
app.use(express.json());
app.use(cors());


app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
  })
);


app.use(passport.initialize());
app.use(
  fileupload({
    useTempFiles: true,
    limits: { fileSize: 10 * 1024 * 1024 },
  })
);



// ROUTES
app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "Welcome to Events Server" });
});
app.use("/api/auth", userRoutes);
app.use("/api/event", eventRoutes);
app.use("/auth", googleRoutes);

// error routes
app.use("/", (req, res) => {
  res.status(404).json({ success: false, message: "ROUTE NOT FOUND" });
});


const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, { dbName: "EVENTS-DB" });
    app.listen(PORT, () => {
      console.log(`App Running on PORT ${PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
};
startServer();
