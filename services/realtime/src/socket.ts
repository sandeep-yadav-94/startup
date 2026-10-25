
import { Server } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

let io: Server;

export const initSocket = (server: http.Server) => {
  io = new Server(server, {
    cors: {
      origin: "*"
    }
  });
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SEC!);
      if (!decoded || typeof decoded !== "object") {
        return next(new Error("Authentication error"));
      }
      const user = decoded.user;
      if (!user || typeof user !== "object" || Array.isArray(user)) {
        return next(new Error("Authentication error"));
      }
      const userId =
        typeof user._id === "string"
          ? user._id
          : typeof user.id === "string"
            ? user.id
            : undefined;
      if (!userId) {
        return next(new Error("Authentication error"));
      }
      socket.data.user = {
        id: userId,
        businessId: typeof user.businessId === "string" ? user.businessId : undefined,
      };
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });
  io.on("connection", (socket) => {
    const user = socket.data.user;
    if (!user) {
      socket.disconnect();
      return;
    }
    const userId = user.id;
    socket.join(userId);
    if (user.businessId) {
      socket.join(`business:${user.businessId}`);
    }
    console.log(`User connected: ${userId}`);
    console.log("Socket room: ", [...socket.rooms]);

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${userId}`);
    });
  });
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};
