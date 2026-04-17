import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

export const REALTIME_EVENTS = {
  SCHEDULE_CREATED: 'schedule.created',
  SCHEDULE_UPDATED: 'schedule.updated',
  SCHEDULE_DELETED: 'schedule.deleted',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_STATUS_CHANGED: 'user.statusChanged',
  USER_ROLE_CHANGED: 'user.roleChanged',
  USER_DELETED: 'user.deleted',
  AUDIT_CREATED: 'audit.created',
} as const;

export type RealtimeEventName = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

let socket: Socket | null = null;

function getToken() {
  return useAuthStore.getState().accessToken;
}

function createSocketInstance(token: string) {
  return io('/', {
    path: '/socket.io',
    transports: ['websocket'],
    withCredentials: true,
    autoConnect: false,
    auth: { token },
  });
}

export function connectRealtime() {
  const token = getToken();
  if (!token) return null;

  if (!socket) {
    socket = createSocketInstance(token);
  } else {
    socket.auth = { token };
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function reconnectRealtimeWithFreshToken() {
  if (!socket) return;
  const token = getToken();
  if (!token) {
    socket.disconnect();
    return;
  }

  socket.auth = { token };
  if (socket.connected) socket.disconnect();
  socket.connect();
}

export function disconnectRealtime() {
  if (!socket) return;
  socket.disconnect();
}

export function getRealtimeSocket() {
  return socket;
}
