import { create } from 'zustand';
import type { UserProfile } from '../types'; 

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  privateKey: CryptoKey | null;
  setAuth: (token: string, refreshToken: string, user: UserProfile) => void;
  setToken: (token: string) => void;
  setPrivateKey: (key: CryptoKey) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('wb_token'),
  refreshToken: localStorage.getItem('wb_refresh'),
  user: JSON.parse(localStorage.getItem('wb_user') || 'null'),
  privateKey: null, 

  setAuth: (token, refreshToken, user) => {
    localStorage.setItem('wb_token', token);
    localStorage.setItem('wb_refresh', refreshToken);
    localStorage.setItem('wb_user', JSON.stringify(user));
    set({ token, refreshToken, user });
  },

  setToken: (token) => {
    localStorage.setItem('wb_token', token);
    set({ token });
  },

  setPrivateKey: (key) => set({ privateKey: key }),

  logout: () => {
    localStorage.removeItem('wb_token');
    localStorage.removeItem('wb_refresh');
    localStorage.removeItem('wb_user');
    set({ token: null, refreshToken: null, user: null, privateKey: null });
  },
}));