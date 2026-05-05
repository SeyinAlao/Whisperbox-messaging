const BASE_URL = 'https://whisperbox.koyeb.app';

export interface RegisterPayload {
  username: string;
  display_name: string;
  password: string;
  public_key: string;
  wrapped_private_key: string;
  pbkdf2_salt: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  public_key: string;
  wrapped_private_key: string;
  pbkdf2_salt: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
}

export interface SearchUserResult {
  id: string;
  username: string;
  display_name: string;
}

export interface MessagePayload {
  ciphertext: string;
  iv: string;
  encryptedKey: string;
  encryptedKeyForSelf: string;
}

export interface ConversationItem {
  user_id: string;
  display_name: string;
  username: string;
  last_message_at: string;
}

export interface MessageItem {
  id: string;
  from_user_id: string;
  to_user_id: string;
  payload: MessagePayload;
  delivered: boolean;
  created_at: string;
}


export const api = {
  async register(data: RegisterPayload): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Registration failed');
    }
    return res.json();
  },

  async login(credentials: LoginPayload): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Login failed');
    }
    return res.json();
  },

  async getMe(token: string): Promise<UserProfile> {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },

  async refresh(refreshToken: string): Promise<{ access_token: string; token_type: string; expires_in: number }> {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) throw new Error('Token refresh failed');
    return res.json();
  },

  async logout(token: string, refreshToken: string): Promise<void> {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  },

  async searchUsers(query: string, token: string): Promise<SearchUserResult[]> {
    const res = await fetch(`${BASE_URL}/users/search?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Search failed');
    return res.json();
  },

  async getPublicKey(userId: string, token: string): Promise<{ public_key: string }> {
    const res = await fetch(`${BASE_URL}/users/${userId}/public-key`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch public key');
    return res.json();
  },

  async getConversations(token: string): Promise<ConversationItem[]> {
    const res = await fetch(`${BASE_URL}/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch conversations');
    return res.json();
  },

  async getMessages(userId: string, token: string, limit = 50, before?: string): Promise<MessageItem[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.append('before', before);
    const res = await fetch(`${BASE_URL}/conversations/${userId}/messages?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch messages');
    return res.json();
  },

  async sendMessage(toUserId: string, payload: MessagePayload, token: string): Promise<MessageItem> {
    const res = await fetch(`${BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to: toUserId, payload }),
    });
    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
  },
};