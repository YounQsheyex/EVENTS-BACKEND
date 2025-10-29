<<<<<<< HEAD
require("dotenv").config();
const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const { init } = require("./helpers/socketio.js"); // import your socket module
const io = init(server); // initialize socket.io
const cors = require("cors");
const mongoose = require("mongoose");
const fileupload = require("express-fileupload");
const passport = require("passport");
const session = require("express-session");
const PORT = process.env.PORT || 5500;

require("./config/passport");

const cloudinary = require("cloudinary").v2;

const userRoutes = require("./routes/userRoutes");
const eventraRoutes = require("./routes/eventraRoutes");
const eventRoutes = require("./routes/eventRoutes");
const googleRoutes = require("./routes/googleRoutes");
const contactRoutes = require("./routes/contactRoute");
const testimonialRoutes = require("./routes/testimonialRoutes");

const ticketRoutes = require("./routes/ticketRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const verifyQrcode = require("./routes/qrcode");
const webhookRoutes = require("./routes/webhookRoute");
const notificationRoutes = require("./routes/notificationRoutes");

// Import Error middleware to handle errors throughout the API.
const errorMiddleware = require("./middleware/error");
// Import arcjet middleware to handle rate limiting throughout the API.
const arcjetMiddleware = require("./middleware/arjectMiddleware");
const redisConfig = require("./helpers/redis");
const socketAuth = require("./middleware/socketMiddleware.js");
const { isUser } = require("./middleware/auth.js");

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
app.use("/api/eventra", eventraRoutes);
// make use of errorMiddleware as backup if ever any error occurs in any event route.
app.use("/api/events", eventRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/qrcode", verifyQrcode);
app.use("/api/webhook", webhookRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/auth", googleRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/contact", contactRoutes);

// Middleware: runs before each socket connection
io.use(socketAuth(isUser));

io.on("connection", (socket) => {
  socket.emit("connected", socket.user);
  console.log(`User connected: ${socket.id} (${socket.user.firstname})`);

  socket.on("joinRoom", (room) => {
    console.log("room: ", room);
    if (room !== "admin") {
      const err = new Error(
        `Dear ${socket.user.firstname}, You are not allowed to join this room`
      );
      socket.emit("error", err.message); // trigger the error event
      return;
    }

    socket.join(room);
    io.to(room).emit("joinRoom", `${socket.user.firstname} joined ${room}`);
  });

  socket.on("roomMessage", ({ room, obj }) => {
    console.log("obj: ", obj);
    io.to(room).emit("roomMessage", {
      user: socket.user.firstname,
      ...obj,
    });
  });

  socket.on("disconnect", () => {
    console.log(`${socket.user.firstname} disconnected`);
  });
});

// error routes
app.use("/", (req, res) => {
  res.status(404).json({ success: false, message: "ROUTE NOT FOUND" });
});

app.use(errorMiddleware);

const startServer = async () => {
  try {
    server.listen(8080, () => {
      console.log("Listening on http://localhost:8080");
    });
    redisConfig.flushall("ASYNC");
    await mongoose.connect(process.env.MONGO_URL, { dbName: "EVENTS-DB" });
    app.listen(PORT, () => {
      console.log(`App Running on PORT ${PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
};
startServer();
=======
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
const eventraRoutes = require("./routes/eventraRoutes");
const eventRoutes = require("./routes/eventRoutes");
const googleRoutes = require("./routes/googleRoutes");
const contactRoutes = require("./routes/contactRoute");
const testimonialRoutes = require("./routes/testimonialRoutes");

const ticketRoutes = require("./routes/ticketRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const verifyQrcode = require("./routes/qrcode");
const webhookRoutes = require("./routes/webhookRoute");
const notificationRoutes = require("./routes/notificationRoutes");

// Import Error middleware to handle errors throughout the API.
const errorMiddleware = require("./middleware/error");
// Import arcjet middleware to handle rate limiting throughout the API.
const arcjetMiddleware = require("./middleware/arjectMiddleware");
const redisConfig = require("./helpers/redis");

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
app.use("/api/eventra", eventraRoutes);
// make use of errorMiddleware as backup if ever any error occurs in any event route.
app.use("/api/events", eventRoutes);
// app.use("/api/tickets", ticketRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/qrcode", verifyQrcode);
// app.use("/api/webhook", webhookRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/auth", googleRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/contact", contactRoutes);

// error routes
app.use("/", (req, res) => {
  res.status(404).json({ success: false, message: "ROUTE NOT FOUND" });
});

app.use(errorMiddleware);

const startServer = async () => {
  try {
    redisConfig.flushall("ASYNC");
    await mongoose.connect(process.env.MONGO_URL, { dbName: "EVENTS-DB" });
    app.listen(PORT, () => {
      console.log(`App Running on PORT ${PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
};
startServer();
>>>>>>> 70d8561d984e2ec266a471a46589bf3d40b3c50b
