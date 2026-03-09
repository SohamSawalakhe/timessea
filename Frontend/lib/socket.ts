import { io } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Export a single shared socket connection to prevent connection exhaustion
export const globalSocket = io(API_URL, {
  autoConnect: true,
});
