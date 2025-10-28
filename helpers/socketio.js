// socket.js
let io;

module.exports = {
  init: (server) => {
    const socketio = require("socket.io")(server, {
      cors: { origin: "*" },
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
