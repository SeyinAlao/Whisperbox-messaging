export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );
}

export function generateSalt(): Uint8Array {
  return window.crypto.getRandomValues(new Uint8Array(16));
}

export async function deriveWrappingKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-KW', length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  );
}

export async function exportPublicKeyToBase64(publicKey: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('spki', publicKey);
  return arrayBufferToBase64(exported);
}

export async function wrapPrivateKey(privateKey: CryptoKey, wrappingKey: CryptoKey): Promise<string> {
  const wrapped = await window.crypto.subtle.wrapKey(
    'pkcs8',
    privateKey,
    wrappingKey,
    'AES-KW'
  );
  return arrayBufferToBase64(wrapped);
}

export async function unwrapPrivateKey(wrappedKeyBase64: string, wrappingKey: CryptoKey): Promise<CryptoKey> {
  const wrappedBuffer = base64ToArrayBuffer(wrappedKeyBase64);

  return await window.crypto.subtle.unwrapKey(
    'pkcs8',
    wrappedBuffer,
    wrappingKey,
    'AES-KW',
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['decrypt']
  );
}

export async function importPublicKey(base64: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(base64);
  return await window.crypto.subtle.importKey(
    'spki',
    keyBuffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt']
  );
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  encryptedKey: string;
  encryptedKeyForSelf: string;
}

export async function encryptMessage(
  plaintext: string,
  recipientPublicKey: CryptoKey,
  senderPublicKey: CryptoKey
): Promise<EncryptedPayload> {
  const enc = new TextEncoder();

  const aesKey = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  );
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); 

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    enc.encode(plaintext)
  );

  const rawAesKey = await window.crypto.subtle.exportKey('raw', aesKey);

  const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    recipientPublicKey,
    rawAesKey
  );

  const encryptedKeyForSelfBuffer = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    senderPublicKey,
    rawAesKey
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(iv.buffer),
    encryptedKey: arrayBufferToBase64(encryptedKeyBuffer),
    encryptedKeyForSelf: arrayBufferToBase64(encryptedKeyForSelfBuffer),
  };
}

export async function decryptMessage(
  payload: EncryptedPayload,
  privateKey: CryptoKey,
  isSentByMe: boolean
): Promise<string> {
  const dec = new TextDecoder();

  const encryptedKeyBase64 = isSentByMe ? payload.encryptedKeyForSelf : payload.encryptedKey;
  const encryptedKeyBuffer = base64ToArrayBuffer(encryptedKeyBase64);

  const rawAesKeyBuffer = await window.crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    encryptedKeyBuffer
  );

  const aesKey = await window.crypto.subtle.importKey(
    'raw',
    rawAesKeyBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const iv = base64ToArrayBuffer(payload.iv);
  const ciphertextBuffer = base64ToArrayBuffer(payload.ciphertext);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    ciphertextBuffer
  );

  return dec.decode(decryptedBuffer);
}