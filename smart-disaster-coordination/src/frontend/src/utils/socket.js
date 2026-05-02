import { io } from "socket.io-client";

const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL ||
  (process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, "") : "http://localhost:5000");

const socket = io(SOCKET_URL, {
  transports: ["websocket"], // faster + stable
});

export default socket;
