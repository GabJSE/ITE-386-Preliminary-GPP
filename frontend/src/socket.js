// src/socket.js
import { io } from "socket.io-client";

let socket = null;

export function initSocket(userId) {
  if (!userId) return null;

  // If already connected, just return it
  if (socket && socket.connected) return socket;

  socket = io("http://localhost:5000", {
    transports: ["websocket"],
    reconnectionAttempts: 3,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    console.log("[Socket] connected", socket.id);
    socket.emit("join", userId);
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket] disconnected", reason);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    console.log("[Socket] manually disconnected");
    socket = null;
  }
}
