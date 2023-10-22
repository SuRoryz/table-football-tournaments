import io from "socket.io-client";
import { getQueueLength, socketEvents } from "./emit";

export const socket = io(`/`, {transports: ['websocket', 'polling']});
socket.on("connect_error", (err) => {
    console.log(`connect_error due to ${err.message}`);
  });

export const initSockets = ({ setValue }) => {
  socketEvents({ setValue });
};