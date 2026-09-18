import { useState } from 'react';
import { ShieldCheck, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface LoginModalProps {
  apiBase: string;
  onLoginSuccess: (user: {
    id: number;
    badge_number: string;
    full_name: string;
    rank: string;
    station_name: string;
    role: string;
    username: string;
  }) => void;
  onClose: () => void;
}

export default function LoginModal({ apiBase, onLoginSuccess, onClose }: LoginModalProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (idToUse?: string, passToUse?: string) => {
    const id = idToUse || identifier;
    const pwd = passToUse || password;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: id.trim(),
          password: pwd
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Authentication failed.');
      }

      const data = await res.json();
      localStorage.setItem('investra_token', data.access_token);
      localStorage.setItem('investra_user', JSON.stringify(data.user));
      onLoginSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-7 shadow-2xl space-y-5">
        <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
          <div className="p-2.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Police Officer Authentication</h3>
            <p className="text-slate-400 text-xs">INVESTRA Investigation Intelligence Access</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-lg text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); void handleLogin(); }} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Badge ID / Username</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="e.g. WB-IPS-4920 or arjun"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-3 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-10 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-2 top-1.5 rounded p-1.5 text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In as Officer'}</span>
            <ArrowRight size={15} />
          </button>
        </form>

        <p className="border-t border-slate-800 pt-4 text-[11px] text-slate-500">Use your department-issued username, official email address, or badge ID. Access is logged and role controlled.</p>
      </div>
    </div>
  );
}
