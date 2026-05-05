import { useState, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { api } from '../lib/api';
import { encryptMessage, importPublicKey } from '../lib/crypto';
import { useWebSocket } from '../hooks/useWebSocket';

const publicKeyCache = new Map<string, CryptoKey>();

interface Props {
  recipientId: string;
  recipientDisplayName: string;
}

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const TinyLockIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export default function MessageInput({ recipientId, recipientDisplayName }: Props) {
  const { token, user, privateKey } = useAuthStore();
  const { addMessage, upsertConversation, wsConnected } = useChatStore();
  const { sendWsMessage } = useWebSocket();

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  };

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !token || !user || !privateKey) return;

    setSending(true);
    setError(null);

    try {
      let recipientPubKey = publicKeyCache.get(recipientId);
      if (!recipientPubKey) {
        const { public_key: recipientKeyB64 } = await api.getPublicKey(recipientId, token);
        recipientPubKey = await importPublicKey(recipientKeyB64);
        if (recipientPubKey) publicKeyCache.set(recipientId, recipientPubKey);
      }

      let myPubKey = publicKeyCache.get(user.id);
      if (!myPubKey) {
        myPubKey = await importPublicKey(user.public_key);
        if (myPubKey) publicKeyCache.set(user.id, myPubKey);
      }

      if (!recipientPubKey || !myPubKey) {
        throw new Error('Failed to load public keys for encryption.');
      }

      const payload = await encryptMessage(trimmed, recipientPubKey, myPubKey);

      let msgId = `local-${Date.now()}`;
      if (wsConnected) {
        sendWsMessage(recipientId, payload);
      } else {
        const res = await api.sendMessage(recipientId, payload, token);
        msgId = res.id;
      }

      addMessage(recipientId, {
        id: msgId,
        from_user_id: user.id,
        to_user_id: recipientId,
        text: trimmed,
        created_at: new Date().toISOString(),
        delivered: !wsConnected,
        status: 'sent',
      });

      upsertConversation(recipientId, recipientDisplayName, '');

      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  }, [
    text,
    token,
    user,
    privateKey,
    recipientId,
    wsConnected,
    addMessage,
    upsertConversation,
    recipientDisplayName,
    sendWsMessage,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 bg-[#12121a] border-t border-gray-800/50 shrink-0 w-full z-10">
      {error && (
        <div className="mb-3 p-2.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex items-end gap-2.5 max-w-4xl mx-auto">
        <textarea
          ref={textareaRef}
          className="flex-1 bg-[#1a1a24] text-white placeholder-gray-500 border border-gray-700/50 rounded-2xl px-4 py-3 min-h-[46px] max-h-[120px] resize-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-[15px] leading-relaxed transition-colors scrollbar-thin scrollbar-thumb-gray-700"
          placeholder={`Message ${recipientDisplayName}`}
          rows={1}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <button
          className="p-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 h-[46px] w-[46px]"
          onClick={handleSend}
          disabled={!text.trim() || sending}
          title="Send (Enter)"
          aria-label="Send message"
        >
          {sending ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <SendIcon />
          )}
        </button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-500 select-none">
        <TinyLockIcon />
        <span>End-to-end encrypted</span>
        <span className="opacity-50 px-1">·</span>
        <span>Shift+Enter for new line</span>
      </div>
    </div>
  );
}