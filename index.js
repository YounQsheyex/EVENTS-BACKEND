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

// Import Error middleware to handle errors throughout the API.
const errorMiddleware = require("./middleware/error");
// Import arcjet middleware to handle rate limiting throughout the API.
const arcjetMiddleware = require("./middleware/arjectMiddleware");
const redisConfig = require("./helpers/redis");
const { DRAFTED_EVENTS } = require("./models/eventSchema");

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

// Configuration for Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Arcjet rate limiter to prevent users from spamming the server by allowing a limited number of requests to be made by a user within a given time
app.use(arcjetMiddleware);

// ROUTES
app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "Welcome to Events Server" });
});
app.use("/api/auth", userRoutes);
// make use of errorMiddleware as backup if ever any error occurs in any event route.
app.use("/api/events", eventRoutes, errorMiddleware);
app.use("/auth", googleRoutes);

// error routes
app.use("/", (req, res) => {
  res.status(404).json({ success: false, message: "ROUTE NOT FOUND" });
});

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, { dbName: "EVENTS-DB" });
    DRAFTED_EVENTS.deleteMany({ title: "This Is A Drafted Event DEMO" }); // Clear the DraftedEvents collection on server start
    redisConfig.flushall("ASYNC", (err, succeeded) => {
      if (err) {
        console.error("Error flushing Redis cache:", err);
      } else {
        console.log("Redis cache flushed successfully:", succeeded);
      }
    });
    app.listen(PORT, () => {
      console.log(`App Running on PORT ${PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
};
startServer();
