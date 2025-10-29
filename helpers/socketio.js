// socket.js
let io;

module.exports = {
  init: (server) => {
    const socketio = require("socket.io")(server, {
      cors: {
        origin: [
          process.env.FRONTEND_URL,
          process.env.FRONTEND_DASHBOARD,
          "http://127.0.0.1:5500",
        ],
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
