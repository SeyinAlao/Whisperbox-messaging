import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore, type ActiveContact } from '../store/useChatStore';

type SearchResultItem = { id: string; username: string; display_name: string };

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ComposeIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const ChatBubbleIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export default function ConversationList() {
  const { token, user, logout } = useAuthStore();
  const {
    conversations,
    activeContact,
    setConversations,
    setActiveContact,
    setLoadingConversations,
    isLoadingConversations,
    wsConnected,
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoadingConversations(true);
    api
      .getConversations(token)
      .then(setConversations)
      .catch(console.error)
      .finally(() => setLoadingConversations(false));
  }, [token, setConversations, setLoadingConversations]);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);

    if (!searchQuery.trim() || !token) {
      setTimeout(() => {
        setSearchResults([]);
        setIsSearching(false);
      }, 0);
      return;
    }

    searchDebounce.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await api.searchUsers(searchQuery, token);
        const usersArray = Array.isArray(results)
          ? results
          : (results as { users?: SearchResultItem[] }).users;
        setSearchResults(usersArray || []);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [searchQuery, token]);

  const openContact = (contact: ActiveContact) => {
    setActiveContact(contact);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleLogout = async () => {
    const { token: t, refreshToken } = useAuthStore.getState();
    if (t && refreshToken) {
      try { await api.logout(t, refreshToken); } catch { /* ignore */ }
    }
    logout();
  };

  return (
    <div className="flex flex-col h-full bg-[#12121a] text-gray-200 w-full relative">
      <div className="flex items-center justify-between p-4 border-b border-gray-800/50 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white tracking-tight">Messages</span>
          <span
            className={`w-2 h-2 rounded-full transition-colors ${wsConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-gray-500 animate-pulse'}`}
            title={wsConnected ? 'Connected' : 'Reconnecting…'}
          />
        </div>
        <div className="flex items-center">
          <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/60 rounded-lg transition-colors focus:outline-none" title="New conversation" aria-label="New conversation">
            <ComposeIcon />
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-gray-800/50 shrink-0">
        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-gray-500 flex items-center justify-center">
            <SearchIcon />
          </span>
          <input
            className="w-full bg-[#1a1a24] text-white pl-10 pr-4 py-2.5 rounded-xl border border-gray-700/50 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm placeholder-gray-500 transition-colors"
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {searchQuery.trim() && (
        <div className="absolute top-[138px] left-0 right-0 z-20 bg-[#12121a] border-b border-gray-800/80 shadow-2xl max-h-72 overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-center text-sm text-gray-500">Searching…</div>
          ) : searchResults.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">No users found</div>
          ) : (
            searchResults.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-800/60 cursor-pointer transition-colors"
                onClick={() =>
                  openContact({ id: u.id, username: u.username, display_name: u.display_name })
                }
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-indigo-600 text-white text-xs font-medium shrink-0 shadow-sm">
                  {getInitials(u.display_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium text-gray-100 truncate">{u.display_name}</div>
                  <div className="text-[13px] text-gray-500 truncate">@{u.username}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
        {isLoadingConversations ? (
          <div className="p-2 space-y-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-gray-800/50 shrink-0" />
                <div className="flex-1">
                  <div className="h-3.5 bg-gray-800/50 rounded w-3/5 mb-2.5" />
                  <div className="h-2.5 bg-gray-800/50 rounded w-2/5" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-500 gap-3">
            <ChatBubbleIcon />
            <span className="text-sm">Search for someone to start a conversation</span>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {conversations.map((c) => {
              const isActive = activeContact?.id === c.user_id;
              return (
                <div
                  key={c.user_id}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${isActive ? 'bg-gray-800/60 shadow-sm' : 'hover:bg-gray-800/40'}`}
                  onClick={() =>
                    openContact({
                      id: c.user_id,
                      username: c.username,
                      display_name: c.display_name,
                    })
                  }
                >
                  <div className="relative">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-600 text-white font-medium shrink-0 shadow-sm">
                      {getInitials(c.display_name)}
                    </div>
                    {isActive && activeContact.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#12121a] rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className="text-[15px] font-semibold text-gray-100 truncate pr-2">
                        {c.display_name}
                      </span>
                      <span className="text-xs text-gray-500 shrink-0">
                        {formatTime(c.last_message_at)}
                      </span>
                    </div>
                    <div className="text-[13px] text-gray-500 truncate opacity-0 h-0">...</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 p-4 border-t border-gray-800/50 bg-[#12121a]/95 backdrop-blur-sm shrink-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-800 text-gray-300 text-[13px] font-medium shrink-0 border border-gray-700/50">
          {user ? getInitials(user.display_name) : '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-200 truncate">{user?.display_name}</div>
          <div className="text-xs text-gray-500 truncate">@{user?.username}</div>
        </div>
        <button
          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors focus:outline-none"
          title="Sign out"
          aria-label="Sign out"
          onClick={handleLogout}
        >
          <LogoutIcon />
        </button>
      </div>
    </div>
  );
}