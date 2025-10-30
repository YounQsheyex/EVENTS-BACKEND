// socket.js
let io;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5500",
];

module.exports = {
  init: (server) => {
    const socketio = require("socket.io")(server, {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
      },
    });
    io = socketio;
    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error("Socket.io not initialized!");
    }
    return io;
  },
};
