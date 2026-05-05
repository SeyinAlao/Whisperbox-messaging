import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { decryptMessage } from '../lib/crypto';
import type { EncryptedPayload } from '../types';
import { api } from '../lib/api';

const WS_BASE = 'wss://whisperbox.koyeb.app/ws';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const { token, refreshToken, user, privateKey, setToken } = useAuthStore();
  const { setWsConnected, addMessage, setUserOnline, upsertConversation } = useChatStore();

  useEffect(() => {
    if (!token || !privateKey) return;

    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connectWs = (accessToken: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const ws = new WebSocket(`${WS_BASE}?token=${accessToken}`);
      wsRef.current = ws;

      ws.onopen = () => setWsConnected(true);

      ws.onclose = (e) => {
        setWsConnected(false);
        if (e.code !== 1000) {
          reconnectTimeout = setTimeout(() => {
            if (useAuthStore.getState().token) connectWs(useAuthStore.getState().token!);
          }, 3000);
        }
      };

      ws.onerror = () => setWsConnected(false);

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'message.receive') {
            const payload: EncryptedPayload = data.payload;
            const fromId: string = data.from_user_id;
            const myId = user?.id;
            if (!privateKey) return;

            const isSentByMe = fromId === myId;
            let text = '[decryption failed]';
            try {
              text = await decryptMessage(payload, privateKey, isSentByMe);
            } catch { /* Graceful failure */ }

            addMessage(fromId === myId ? data.to_user_id : fromId, {
              id: data.id,
              from_user_id: fromId,
              to_user_id: data.to_user_id,
              text,
              created_at: data.created_at,
              delivered: true,
              status: text === '[decryption failed]' ? 'error' : 'received',
            });

            const contactId = fromId === myId ? data.to_user_id : fromId;
            upsertConversation(contactId, '', '');
          }

          if (data.event === 'user.online') setUserOnline(data.user_id, true);
          if (data.event === 'user.offline') setUserOnline(data.user_id, false);
        } catch (err) {
          console.error('WebSocket message error:', err);
        }
      };
    };

    connectWs(token);

    const refreshInterval = setInterval(async () => {
      if (!refreshToken) return;
      try {
        const res = await api.refresh(refreshToken);
        setToken(res.access_token);
        wsRef.current?.close(1000);
        connectWs(res.access_token);
      } catch {
        useAuthStore.getState().logout();
      }
    }, 13 * 60 * 1000);

    return () => {
      clearTimeout(reconnectTimeout);
      clearInterval(refreshInterval);
      wsRef.current?.close(1000);
    };
  }, [token, refreshToken, privateKey, user?.id, setWsConnected, addMessage, setUserOnline, upsertConversation, setToken]);

  const sendWsMessage = useCallback((toUserId: string, payload: EncryptedPayload) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) throw new Error('WebSocket not connected');
    wsRef.current.send(JSON.stringify({ event: 'message.send', to: toUserId, payload }));
  }, []);

  return { sendWsMessage };
}