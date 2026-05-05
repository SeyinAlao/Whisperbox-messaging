import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { api } from '../lib/api';
import { decryptMessage } from '../lib/crypto';
import { useWebSocket } from '../hooks/useWebSocket';
import ConversationList from '../components/ConversationList';
import MessageThread from '../components/MessageThread';
import MessageInput from '../components/MessageInput';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 5l-7 7 7 7" />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

export default function Chat() {
  const { token, user, privateKey } = useAuthStore();
  const { activeContact, setMessages, setLoadingMessages } = useChatStore();
  const [sidebarVisible, setSidebarVisible] = useState(true);

  useWebSocket();

  useEffect(() => {
    if (!activeContact || !token || !privateKey || !user) return;

    setLoadingMessages(true);

    api
      .getMessages(activeContact.id, token, 50)
      .then(async (rawMessages) => {
        const sorted = [...rawMessages].reverse();

        const decrypted = await Promise.all(
          sorted.map(async (msg) => {
            const isSentByMe = msg.from_user_id === user.id;
            let text = '[decryption failed]';
            let status: 'sent' | 'received' | 'error' = isSentByMe ? 'sent' : 'received';
            try {
              text = await decryptMessage(msg.payload, privateKey, isSentByMe);
            } catch {
              status = 'error';
            }
            return {
              id: msg.id,
              from_user_id: msg.from_user_id,
              to_user_id: msg.to_user_id,
              text,
              created_at: msg.created_at,
              delivered: msg.delivered,
              status,
            };
          })
        );

        setMessages(activeContact.id, decrypted);
      })
      .catch(console.error)
      .finally(() => setLoadingMessages(false));
  }, [activeContact, token, privateKey, setMessages, setLoadingMessages, user]);

  useEffect(() => {
    if (activeContact && window.innerWidth <= 768) {
      setTimeout(() => setSidebarVisible(false), 0);
    }
  }, [activeContact]);

  return (
    <div className="flex h-screen bg-[#0a0a0f] text-gray-100 font-sans overflow-hidden">
      
      <div 
        className={`${!sidebarVisible ? 'hidden md:flex' : 'flex'} w-full md:w-[340px] shrink-0 flex-col border-r border-gray-800/50 bg-[#12121a] transition-all duration-300`}
      >
        <ConversationList />
      </div>

      <div className={`flex-1 flex flex-col min-w-0 bg-[#0a0a0f] relative ${sidebarVisible && 'hidden md:flex'}`}>
        {!activeContact ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-800/30 flex items-center justify-center text-gray-500 mb-5">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-200 mb-2">Your messages</h2>
            <p className="text-sm text-gray-500 max-w-sm mb-8">
              Select a conversation or search for someone to start chatting
            </p>
            <div className="flex items-center gap-2 text-xs font-medium text-indigo-400/80 bg-indigo-500/10 px-4 py-2 rounded-full">
              <ShieldCheckIcon />
              <span>End-to-end encrypted</span>
            </div>
          </div>
        ) : (
          <>
            <div className="h-16 flex items-center px-4 border-b border-gray-800/50 bg-[#12121a]/95 backdrop-blur-sm shrink-0 gap-3 z-10">
              <button
                className="md:hidden p-2 -ml-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 rounded-lg transition-colors focus:outline-none"
                onClick={() => setSidebarVisible(true)}
                aria-label="Back to conversations"
              >
                <ArrowLeftIcon />
              </button>

              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white text-sm font-medium shrink-0 shadow-sm">
                {getInitials(activeContact.display_name)}
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-semibold text-gray-100 truncate">
                  {activeContact.display_name}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${activeContact.isOnline ? 'bg-green-500' : 'bg-gray-600'}`}
                  />
                  <span className={`text-[13px] ${activeContact.isOnline ? 'text-green-500' : 'text-gray-500'}`}>
                    {activeContact.isOnline ? 'online' : 'offline'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 shrink-0" title="End-to-end encrypted">
                <ShieldCheckIcon />
              </div>
            </div>

            <MessageThread />
            <MessageInput
              recipientId={activeContact.id}
              recipientDisplayName={activeContact.display_name}
            />
          </>
        )}
      </div>
    </div>
  );
}