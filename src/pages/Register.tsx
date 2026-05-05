import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import {
  generateRSAKeyPair,
  generateSalt,
  deriveWrappingKey,
  exportPublicKeyToBase64,
  wrapPrivateKey,
  arrayBufferToBase64,
} from '../lib/crypto';
import { useAuthStore } from '../store/useAuthStore';

interface FormState {
  username: string;
  displayName: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  username?: string;
  displayName?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

const LockIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const EyeIcon = ({ visible }: { visible: boolean }) =>
  visible ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

export default function Register() {
  const navigate = useNavigate();
  const { setAuth, setPrivateKey } = useAuthStore();

  const [form, setForm] = useState<FormState>({
    username: '',
    displayName: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'generating'>('form');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.username.match(/^[a-zA-Z0-9_-]{3,32}$/)) {
      e.username = '3–32 chars, letters/digits/_ only';
    }
    if (!form.displayName.trim()) {
      e.displayName = 'Display name is required';
    }
    if (form.password.length < 8) {
      e.password = 'Minimum 8 characters';
    }
    if (form.password !== form.confirmPassword) {
      e.confirmPassword = 'Passwords do not match';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setStep('generating');

    try {
      const salt = generateSalt();
      const wrappingKey = await deriveWrappingKey(form.password, salt);
      
      let keyPair: CryptoKeyPair | undefined;
      let wrappedPrivateKeyB64 = '';
      let isValidLength = false;

      while (!isValidLength) {
        try {
          keyPair = await generateRSAKeyPair();
          wrappedPrivateKeyB64 = await wrapPrivateKey(keyPair.privateKey, wrappingKey);
          isValidLength = true; 
        } catch {
          console.warn("Generated key incompatible with AES-KW. Regenerating silently...");
        }
      }

      if (!keyPair) throw new Error("Key generation failed");

      const publicKeyB64 = await exportPublicKeyToBase64(keyPair.publicKey);
      const saltB64 = arrayBufferToBase64(salt.buffer as ArrayBuffer);

      const res = await api.register({
        username: form.username.toLowerCase(),
        display_name: form.displayName.trim(),
        password: form.password,
        public_key: publicKeyB64,
        wrapped_private_key: wrappedPrivateKeyB64,
        pbkdf2_salt: saltB64,
      });

      setAuth(res.access_token, res.refresh_token, res.user);
      setPrivateKey(keyPair.privateKey);

      navigate('/');
    } catch (err: unknown) {
      setErrors({
        general: err instanceof Error ? err.message : 'Registration failed',
      });
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-[#0a0a0f] p-4 overflow-y-auto font-sans text-gray-100">
      <div className="w-full max-w-md bg-[#12121a] rounded-2xl shadow-2xl p-8 border border-gray-800/50 my-8">
        
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400">
            <LockIcon />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-white">WhisperBox</div>
            <div className="text-[10px] font-semibold tracking-wider text-indigo-400/80 uppercase mt-0.5">End-to-end encrypted</div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Create account</h1>
        <p className="text-sm text-gray-400 mb-8">
          Your keys are generated locally. The server never sees your private key.
        </p>

        {errors.general && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-6">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Username</label>
            <input
              className={`w-full px-4 py-2.5 bg-[#1a1a24] border rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 transition-colors ${errors.username ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' : 'border-gray-700/50 focus:border-indigo-500 focus:ring-indigo-500'}`}
              type="text"
              placeholder="alice_92"
              autoComplete="username"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              disabled={loading}
            />
            {errors.username && <span className="text-xs text-red-400 mt-1.5 block">{errors.username}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Display Name</label>
            <input
              className={`w-full px-4 py-2.5 bg-[#1a1a24] border rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 transition-colors ${errors.displayName ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' : 'border-gray-700/50 focus:border-indigo-500 focus:ring-indigo-500'}`}
              type="text"
              placeholder="Alice"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              disabled={loading}
            />
            {errors.displayName && <span className="text-xs text-red-400 mt-1.5 block">{errors.displayName}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                className={`w-full px-4 py-2.5 pr-10 bg-[#1a1a24] border rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 transition-colors ${errors.password ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' : 'border-gray-700/50 focus:border-indigo-500 focus:ring-indigo-500'}`}
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 8 characters"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors focus:outline-none"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <EyeIcon visible={showPassword} />
              </button>
            </div>
            {errors.password && <span className="text-xs text-red-400 mt-1.5 block">{errors.password}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm Password</label>
            <div className="relative">
              <input
                className={`w-full px-4 py-2.5 pr-10 bg-[#1a1a24] border rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 transition-colors ${errors.confirmPassword ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' : 'border-gray-700/50 focus:border-indigo-500 focus:ring-indigo-500'}`}
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repeat password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors focus:outline-none"
                onClick={() => setShowConfirm((v) => !v)}
                tabIndex={-1}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                <EyeIcon visible={showConfirm} />
              </button>
            </div>
            {errors.confirmPassword && (
              <span className="text-xs text-red-400 mt-1.5 block">{errors.confirmPassword}</span>
            )}
          </div>

          <button 
            type="submit" 
            className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed" 
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {step === 'generating' ? 'Generating keys…' : 'Creating account…'}
              </span>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          Already have an account? <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Sign in</Link>
        </div>

        <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-gray-600">
          <LockIcon /> Keys generated client-side · server stores only ciphertext
        </div>
      </div>
    </div>
  );
}