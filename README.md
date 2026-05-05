# 🔒 WhisperBox: End-to-End Encrypted Messaging (Stage 4B)

WhisperBox is a high-security, zero-knowledge messaging application. Designed with the privacy standards of **Signal** and the intuitive user experience of **WhatsApp**, this application ensures that only the intended recipient can read a message.

## 🎯 Objective
Build a secure messaging application where data is encrypted on the client, the server never sees plaintext, and only authorized users can decrypt content.

## 🏗️ System Architecture
<img width="1919" height="907" alt="image" src="https://github.com/user-attachments/assets/79825de3-3ebc-4c16-b778-b238dd72134f" />


### Frontend Responsibilities
- **Key Generation:** Local generation of RSA-2048 keypairs.
- **Key Storage:** Secure handling of private keys in memory via Zustand.
- **Encryption/Decryption:** Ciphertext processing using the Web Crypto API.
- **UI/UX:** A responsive, dark-themed interface built with Tailwind CSS.

### Backend Responsibilities
- **Identity Management:** Managing user accounts and JWT authentication.
- **Encrypted Blob Storage:** Verbatim storage of encrypted messages and wrapped keys.
- **Key Exchange:** Serving public keys to senders for encryption.

## 🔐 Key Management & Encryption Flow
WhisperBox implements a **Hybrid Encryption** scheme to balance security and performance.

### 1. Registration & The "Retry-Loop" Heuristic
- **PBKDF2 Derivation:** Derives a 256-bit **AES-KW** wrapping key from the user's password and a random salt (100,000 iterations).
- **The AES-KW Alignment Fix:** The Web Crypto API requires data wrapped with `AES-KW` to be an exact multiple of 8 bytes. Since RSA PKCS#8 exports vary in length, the registration flow implements a silent **retry-loop**. It regenerates the RSA keypair until a compatible byte length is achieved, ensuring 100% reliability while strictly adhering to the `AES-KW` requirement.
- **Key Wrapping:** The RSA private key is wrapped and sent to the server. The raw private key **never** leaves the client.

### 2. Messaging Flow
- **Encryption (AES-GCM):** A random 256-bit AES key is generated per message. The plaintext is encrypted using AES-GCM (providing both confidentiality and integrity).
- **Key Exchange (RSA-OAEP):** The AES key is encrypted with the recipient's RSA public key.
- **Self-Access:** The AES key is also encrypted with the sender's public key, allowing the sender to view their own message history.

## 🛡️ Security Trade-offs & Decisions

| Decision | Logic | Trade-off |
| :--- | :--- | :--- |
| **In-Memory Storage** | Private keys are stored in RAM and never `localStorage`. | **Security Win:** Immune to disk extraction. **UX Cost:** Refreshing clears keys. |
| **AES-KW for Keys** | Used for wrapping the private key as per NIST standards. | Requires the 8-byte alignment logic in the registration loop. |
| **AES-GCM for Data** | Provides high-speed encryption with built-in tag validation. | Industry standard for modern E2EE. |

## 🚧 Known Limitations
- **Forward Secrecy:** Uses static RSA keys. Future updates will integrate the Double Ratchet Algorithm.
- **Replay Protection:** While GCM provides integrity, additional timestamp-based nonces are planned.
- **Device Sync:** New devices require the password to unwrap the fetched private key.

## 🛠️ Technical Stack
- **Vite + React + TypeScript**
- **Tailwind CSS** - **Zustand** (Secure State Management)
- **Web Crypto API** (Native Browser Cryptography)

## 🚀 Getting Started
1. Clone the repository.
2. Install dependencies: `npm install`
3. Set your environment variables: `VITE_API_BASE_URL=https://whisperbox.koyeb.app/`
4. Start the development server: `npm run dev`

---
*Developed for the Frontend Wizards Program — Stage 4B.*
