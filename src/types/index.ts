export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  public_key: string;
  wrapped_private_key: string;
  pbkdf2_salt: string;
  created_at: string;
}

export interface ConversationItem {
  user_id: string;
  username: string;
  display_name: string;
  last_message_at: string;
}

export interface DecryptedMessage {
  id: string;
  from_user_id: string;
  to_user_id: string;
  text: string;
  created_at: string;
  delivered: boolean;
  status: 'sent' | 'received' | 'error';
}

export interface ActiveContact {
  id: string;
  username: string;
  display_name: string;
  isOnline?: boolean;
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  encryptedKey: string;
  encryptedKeyForSelf: string;
}

export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  privateKey: CryptoKey | null;
  setAuth: (token: string, refreshToken: string, user: UserProfile) => void;
  setToken: (token: string) => void;
  setPrivateKey: (key: CryptoKey) => void;
  logout: () => void;
}