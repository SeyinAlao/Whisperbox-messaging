import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import {
  deriveWrappingKey,
  unwrapPrivateKey,
  base64ToArrayBuffer,
} from '../lib/crypto';
import { useAuthStore } from '../store/useAuthStore';

interface FormErrors {
  username?: string;
  password?: string;
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

export default function Login() {
  const navigate = useNavigate();
  const { setAuth, setPrivateKey } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: FormErrors = {};
    if (!username.trim()) errs.username = 'Username required';
    if (!password) errs.password = 'Password required';
    if (Object.keys(errs).length) return setErrors(errs);

    setLoading(true);
    setErrors({});

    try {
      const res = await api.login({ username: username.toLowerCase().trim(), password });
      const saltBuffer = base64ToArrayBuffer(res.user.pbkdf2_salt);
      const salt = new Uint8Array(saltBuffer);
      const wrappingKey = await deriveWrappingKey(password, salt);
      const privateKey = await unwrapPrivateKey(res.user.wrapped_private_key, wrappingKey);

      setAuth(res.access_token, res.refresh_token, res.user);
      setPrivateKey(privateKey);

      navigate('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      if (msg.includes('unwrap') || msg.includes('decrypt')) {
        setErrors({ general: 'Wrong password — could not decrypt your private key.' });
      } else {
        setErrors({ general: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-whisper-bg p-4 text-gray-100 font-sans">
      <div className="w-full max-w-md bg-whisper-secondary rounded-2xl shadow-2xl p-8 border border-gray-800">
        
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center justify-center w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl">
            <LockIcon />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-white">WhisperBox</div>
            <div className="text-[10px] font-semibold tracking-wider text-indigo-400">END-TO-END ENCRYPTED</div>
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-white mb-2">Welcome back</h1>
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          Your password decrypts your private key locally it never leaves this device.
        </p>

        {errors.general && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm mb-6 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-300">Username</label>
            <input
              className={`w-full bg-whisper-bg border ${errors.username ? 'border-red-500/50' : 'border-gray-700'} rounded-lg px-4 py-2.5 text-gray-100 outline-none focus:border-indigo-500 transition-colors`}
              type="text"
              placeholder="alice_92"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
            {errors.username && <span className="text-xs text-red-400 mt-1">{errors.username}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-300">Password</label>
            <div className="relative">
              <input
                className={`w-full bg-whisper-bg border ${errors.password ? 'border-red-500/50' : 'border-gray-700'} rounded-lg px-4 py-2.5 text-gray-100 outline-none focus:border-indigo-500 transition-colors pr-10`}
                type={showPassword ? 'text' : 'password'}
                placeholder="Your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <EyeIcon visible={showPassword} />
              </button>
            </div>
            {errors.password && <span className="text-xs text-red-400 mt-1">{errors.password}</span>}
          </div>

          <button 
            type="submit" 
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center mt-2" 
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Unlocking…
              </div>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-400">
          No account yet? <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">Create one</Link>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
          <LockIcon />
          Private key derived locally · never transmitted
        </div>
      </div>
    </div>
  );
}