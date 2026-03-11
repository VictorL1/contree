import { io, Socket } from 'socket.io-client';
import type { ClientEvents, ServerEvents } from '@contree/shared';

type TypedSocket = Socket<ServerEvents, ClientEvents>;

let socket: TypedSocket | null = null;
let socketToken: string | null = null;

export function getSocket(): TypedSocket {
  const token = sessionStorage.getItem('accessToken');

  // Si le token a changé (login/logout), recréer le socket
  if (socket && token !== socketToken) {
    socket.disconnect();
    socket = null;
  }

  if (!socket) {
    socketToken = token;
    const serverUrl = import.meta.env.VITE_SERVER_URL || undefined;
    socket = io(serverUrl, {
      auth: { token },
      autoConnect: false,
    }) as TypedSocket;
  }
  return socket;
}

export function connectSocket(): TypedSocket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketToken = null;
  }
}
