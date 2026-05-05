import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';

function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

const DeliveredTick = () => (
  <svg width="14" height="10" viewBox="0 0 16 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-300 opacity-90">
    <polyline points="1 5.5 5 9.5 11 2" />
    <polyline points="6 5.5 10 9.5 16 2" />
  </svg>
);

const SentTick = () => (
  <svg width="10" height="10" viewBox="0 0 12 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
    <polyline points="1 5.5 5 9.5 11 2" />
  </svg>
);

const AlertIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-red-400">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export default function MessageThread() {
  const { user } = useAuthStore();
  const { activeContact, messages, isLoadingMessages } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  const contactMessages = activeContact ? (messages[activeContact.id] || []) : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [contactMessages.length]);

  if (isLoadingMessages) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0a0a0f]">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`flex w-full ${i % 3 === 0 ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className="animate-pulse bg-gray-800/50"
              style={{
                height: 40,
                width: `${30 + (i % 4) * 15}%`,
                borderRadius: '16px',
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (contactMessages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0a0a0f] text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-800/30 flex items-center justify-center text-gray-500 mb-5">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div className="text-base font-semibold text-gray-200 mb-1">
          Messages are end-to-end encrypted
        </div>
        <div className="text-sm text-gray-500 max-w-sm">
          Only you and {activeContact?.display_name} can read them.
        </div>
      </div>
    );
  }

  const grouped: { date: string; messages: typeof contactMessages }[] = [];
  let currentDate = '';
  for (const msg of contactMessages) {
    const dateLabel = formatDateLabel(msg.created_at);
    if (dateLabel !== currentDate) {
      currentDate = dateLabel;
      grouped.push({ date: dateLabel, messages: [] });
    }
    grouped[grouped.length - 1].messages.push(msg);
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-[#0a0a0f] scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
      <div className="max-w-4xl mx-auto flex flex-col gap-1.5">
        {grouped.map((group) => (
          <div key={group.date} className="flex flex-col gap-1.5">
            <div className="flex justify-center my-4">
              <span className="px-3 py-1 text-[11px] font-semibold tracking-wide text-gray-400 bg-gray-800/40 rounded-full uppercase">
                {group.date}
              </span>
            </div>
            
            {group.messages.map((msg) => {
              const isMine = msg.from_user_id === user?.id;
              const isError = msg.status === 'error';
              
              return (
                <div
                  key={msg.id}
                  className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[75%] px-4 py-2.5 relative group flex flex-col shadow-sm
                      ${isError ? 'bg-red-500/10 border border-red-500/20 text-red-200 rounded-2xl' 
                      : isMine ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' 
                      : 'bg-[#1e1e2a] text-gray-100 rounded-2xl rounded-tl-sm border border-gray-800/50'}`}
                  >
                    {isError ? (
                      <div className="flex items-center gap-2 text-[15px] leading-relaxed break-words">
                        <AlertIcon />
                        <span>Could not decrypt message</span>
                      </div>
                    ) : (
                      <div className="text-[15px] whitespace-pre-wrap break-words leading-relaxed">
                        {msg.text}
                      </div>
                    )}
                    
                    <div className={`flex items-center justify-end gap-1 mt-1.5 text-[11px] select-none ${isMine && !isError ? 'text-indigo-200/80' : 'text-gray-500'}`}>
                      <span>{formatMessageTime(msg.created_at)}</span>
                      {isMine && !isError && (
                        <span className="ml-0.5 flex items-center justify-center">
                          {msg.delivered ? <DeliveredTick /> : <SentTick />}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} className="h-2" />
      </div>
    </div>
  );
}