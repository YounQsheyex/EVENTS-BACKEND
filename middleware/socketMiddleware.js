const socketAuth = (middleware) => (socket, next) => {
  const socketReq = {
    headers: { authorization: `Bearer ${socket.handshake.auth?.token}` },
  };
  const socketRes = {
    status: (code) => ({
      json: (data) => next(new Error(data.message)),
    }),
  };
  middleware(socketReq, socketRes, (err) => {
    if (err) return next(err);
    socket.user = socketReq.user;
    next();
  });
};

module.exports = socketAuth;
