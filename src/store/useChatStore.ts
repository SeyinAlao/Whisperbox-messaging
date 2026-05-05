import { create } from 'zustand';
import type { ConversationItem, DecryptedMessage } from '../types'; 

export interface ActiveContact {
  id: string;
  username: string;
  display_name: string;
  isOnline?: boolean;
}

interface ChatState {
  conversations: ConversationItem[];
  activeContact: ActiveContact | null;
  messages: Record<string, DecryptedMessage[]>;
  isLoadingMessages: boolean;
  isLoadingConversations: boolean;
  wsConnected: boolean;

  setConversations: (convos: ConversationItem[]) => void;
  setActiveContact: (contact: ActiveContact | null) => void;
  addMessage: (contactId: string, message: DecryptedMessage) => void;
  setMessages: (contactId: string, messages: DecryptedMessage[]) => void;
  setLoadingMessages: (val: boolean) => void;
  setLoadingConversations: (val: boolean) => void;
  setWsConnected: (val: boolean) => void;
  setUserOnline: (userId: string, online: boolean) => void;
  upsertConversation: (userId: string, displayName: string, username: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeContact: null,
  messages: {},
  isLoadingMessages: false,
  isLoadingConversations: false,
  wsConnected: false,

  setConversations: (convos) => set({ conversations: convos }),

  setActiveContact: (contact) => set({ activeContact: contact }),

  addMessage: (contactId, message) =>
    set((state) => {
      const existing = state.messages[contactId] || [];
      if (existing.find((m) => m.id === message.id)) return state;
      return {
        messages: {
          ...state.messages,
          [contactId]: [...existing, message],
        },
      };
    }),

  setMessages: (contactId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [contactId]: messages },
    })),

  setLoadingMessages: (val) => set({ isLoadingMessages: val }),
  setLoadingConversations: (val) => set({ isLoadingConversations: val }),
  setWsConnected: (val) => set({ wsConnected: val }),

  setUserOnline: (userId, online) =>
    set((state) => ({
      activeContact:
        state.activeContact?.id === userId
          ? { ...state.activeContact, isOnline: online }
          : state.activeContact,
    })),

  upsertConversation: (userId, displayName, username) =>
    set((state) => {
      const exists = state.conversations.find((c) => c.user_id === userId);
      if (exists) {
        return {
          conversations: state.conversations.map((c) =>
            c.user_id === userId
              ? { ...c, last_message_at: new Date().toISOString() }
              : c
          ),
        };
      }
      return {
        conversations: [
          {
            user_id: userId,
            display_name: displayName,
            username,
            last_message_at: new Date().toISOString(),
          },
          ...state.conversations,
        ],
      };
    }),
}));