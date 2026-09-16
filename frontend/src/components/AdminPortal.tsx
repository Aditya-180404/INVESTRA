import { useState, useEffect } from 'react';
import { Key, UserPlus, Users, CheckCircle, Lock, Unlock, RefreshCw, BadgeAlert } from 'lucide-react';

interface Officer {
  id: number;
  username: string;
  email: string;
  badge_number?: string;
  full_name?: string;
  rank?: string;
  station_name?: string;
  role: string;
  is_active: boolean;
  created_at?: string;
}

interface AdminPortalProps {
  apiBase: string;
  onNotice: (msg: string) => void;
}

const DEFAULT_URL_ENCODED_KEY = "%49%4e%56%45%53%54%52%41%5f%41%44%4d%49%4e%5f%32%30%32%36";

export default function AdminPortal({ apiBase, onNotice }: AdminPortalProps) {
  // Read token from window location or local state
  const [tokenInput, setTokenInput] = useState('');
  const [activeKey, setActiveKey] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('admin_key') || localStorage.getItem('investra_admin_key') || '';
  });
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loadingOfficers, setLoadingOfficers] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form state for new officer
  const [newBadge, setNewBadge] = useState('');
  const [newName, setNewName] = useState('');
  const [newRank, setNewRank] = useState('Inspector of Police');
  const [newStation, setNewStation] = useState('Salt Lake Police Station');
  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('Officer@1234');
  const [submitting, setSubmitting] = useState(false);

  // Validate admin token via backend URL encoding verification
  const verifyToken = async (keyToTest: string) => {
    if (!keyToTest.trim()) {
      setIsAuthorized(false);
      return;
    }
    setVerifying(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${apiBase}/auth/admin/verify?admin_key=${encodeURIComponent(keyToTest.trim())}`);
      const data = await res.json();
      if (data.valid) {
        setIsAuthorized(true);
        setActiveKey(keyToTest.trim());
        localStorage.setItem('investra_admin_key', keyToTest.trim());
        onNotice('Administrator Gateway unlocked via URL-encoded authorization.');
        fetchOfficers(keyToTest.trim());
      } else {
        setIsAuthorized(false);
        setErrorMsg('Invalid URL-encoded admin security key. Verification rejected.');
      }
    } catch {
      setErrorMsg('Failed to reach authentication gateway.');
      setIsAuthorized(false);
    } finally {
      setVerifying(false);
    }
  };

  const fetchOfficers = async (key: string) => {
    setLoadingOfficers(true);
    try {
      const res = await fetch(`${apiBase}/auth/admin/officers?admin_key=${encodeURIComponent(key)}`);
      if (res.ok) {
        const data = await res.json();
        setOfficers(data);
      }
    } catch {
      setErrorMsg('Could not load police officer registry.');
    } finally {
      setLoadingOfficers(false);
    }
  };

  useEffect(() => {
    if (activeKey) {
      void verifyToken(activeKey);
    }
  }, []);

  const handleUnlockWithEncoded = () => {
    setTokenInput(DEFAULT_URL_ENCODED_KEY);
    void verifyToken(DEFAULT_URL_ENCODED_KEY);
  };

  const handleCustomUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    void verifyToken(tokenInput);
  };

  const handleCreateOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBadge || !newName || !newEmail || !newUsername || !newPassword) {
      alert('Please complete all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/auth/admin/officers?admin_key=${encodeURIComponent(activeKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          badge_number: newBadge.trim(),
          full_name: newName.trim(),
          rank: newRank,
          station_name: newStation,
          email: newEmail.trim(),
          username: newUsername.trim(),
          password: newPassword,
          role: 'Police Officer'
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Could not register officer.');
      }

      onNotice(`Police Officer ${newName} (Badge: ${newBadge}) successfully registered in PostgreSQL.`);
      // Reset form
      setNewBadge('');
      setNewName('');
      setNewEmail('');
      setNewUsername('');
      fetchOfficers(activeKey);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (officerId: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`${apiBase}/auth/admin/officers/${officerId}/status?admin_key=${encodeURIComponent(activeKey)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      if (res.ok) {
        onNotice(`Officer status updated.`);
        fetchOfficers(activeKey);
      }
    } catch {
      alert('Failed to update officer status');
    }
  };

  const handleLockConsole = () => {
    setIsAuthorized(false);
    setActiveKey('');
    localStorage.removeItem('investra_admin_key');
    onNotice('Administrator Console locked.');
  };

  // If NOT authorized: Render the URL-Encoding Security Gate
  if (!isAuthorized) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl">
              <Lock size={28} />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-red-400 font-bold">Access Restricted</span>
              <h2 className="text-2xl font-bold text-white">Administrator Gateway (Protected by URL Encoding)</h2>
            </div>
          </div>

          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            In accordance with departmental security requirements, the INVESTRA Administrator Console is guarded by URL encoding verification.
            Only authorized administrators possessing the valid URL-encoded credential token can provision new police officers.
          </p>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-950/40 border border-red-500/40 rounded-xl flex items-center space-x-3 text-red-300 text-sm">
              <BadgeAlert size={20} className="text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Interactive URL Encoding Validator & Quick Access Box */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400">
                <Key size={16} />
                <span>URL ENCODING SECURITY SPECIFICATION</span>
              </div>
              <span className="text-xs font-mono bg-blue-950/50 text-blue-300 px-2 py-0.5 rounded border border-blue-800/50">
                RFC 3986 Standard
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1">Raw Master Admin Passkey:</span>
                <code className="text-amber-300 font-mono font-bold block select-all">INVESTRA_ADMIN_2026</code>
              </div>
              <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1">Protected URL-Encoded Token:</span>
                <code className="text-emerald-400 font-mono font-bold block break-all select-all">
                  {DEFAULT_URL_ENCODED_KEY}
                </code>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                Click below to unlock using the verified URL-encoded credential token:
              </p>
              <button
                onClick={handleUnlockWithEncoded}
                disabled={verifying}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center space-x-2 transition shadow-lg shadow-blue-600/20"
              >
                <Unlock size={14} />
                <span>{verifying ? 'Verifying...' : 'Unlock via URL-Encoded Key'}</span>
              </button>
            </div>
          </div>

          {/* Manual Input Form */}
          <form onSubmit={handleCustomUnlock} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Paste custom URL-encoded key (e.g. %49%4e%56...)"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
            />
            <button
              type="submit"
              disabled={verifying || !tokenInput.trim()}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-6 py-2.5 rounded-lg text-sm font-semibold transition flex items-center justify-center space-x-2"
            >
              {verifying && <RefreshCw size={14} className="animate-spin" />}
              <span>Verify &amp; Authorize</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // If Authorized: Render the Full Administrator Management Console
  return (
    <div className="max-w-7xl mx-auto py-6 space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 mb-1">
            <CheckCircle size={14} />
            <span>AUTHENTICATED VIA URL ENCODING</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Administrator Portal · Police Officer Provisioning</h1>
          <p className="text-slate-400 text-sm mt-1">
            Authorized administrator console for adding and managing police officers with access to INVESTRA cases.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchOfficers(activeKey)}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition flex items-center space-x-1"
            title="Refresh Roster"
          >
            <RefreshCw size={14} className={loadingOfficers ? 'animate-spin' : ''} />
            <span>Sync DB</span>
          </button>
          <button
            onClick={handleLockConsole}
            className="px-3.5 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5"
          >
            <Lock size={14} />
            <span>Lock Console</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Register New Police Officer */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl h-fit">
          <div className="flex items-center space-x-2.5 mb-5 border-b border-slate-800 pb-4">
            <UserPlus size={20} className="text-blue-400" />
            <h2 className="text-lg font-bold text-white">Provision New Officer</h2>
          </div>

          <form onSubmit={handleCreateOfficer} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Police Badge Number *</label>
              <input
                type="text"
                placeholder="e.g. WB-IPS-5102"
                value={newBadge}
                onChange={(e) => setNewBadge(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Full Officer Name *</label>
              <input
                type="text"
                placeholder="e.g. Inspector Debanjan Sen"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Rank *</label>
                <select
                  value={newRank}
                  onChange={(e) => setNewRank(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="Inspector of Police">Inspector</option>
                  <option value="Sub-Inspector">Sub-Inspector</option>
                  <option value="Assistant Sub-Inspector">ASI</option>
                  <option value="Deputy Superintendent">DSP</option>
                  <option value="Station In-Charge">Station In-Charge</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Station Jurisdiction *</label>
                <select
                  value={newStation}
                  onChange={(e) => setNewStation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="Salt Lake Police Station">Salt Lake PS</option>
                  <option value="Bidhannagar East Police Station">Bidhannagar East PS</option>
                  <option value="Electronics Complex Police Station">Electronics Complex PS</option>
                  <option value="New Town Police Station">New Town PS</option>
                  <option value="Lake Town Police Station">Lake Town PS</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Official Email Address *</label>
              <input
                type="email"
                placeholder="officer.name@investra.gov.in"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Portal Username *</label>
                <input
                  type="text"
                  placeholder="e.g. debanjan"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Initial Password *</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2"
            >
              {submitting ? <RefreshCw size={15} className="animate-spin" /> : <UserPlus size={15} />}
              <span>Save &amp; Authorize Officer</span>
            </button>
          </form>
        </div>

        {/* Right Column: Active Police Officers Directory in PostgreSQL */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2.5">
              <Users size={20} className="text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Authorized Police Officers Roster (PostgreSQL)</h2>
            </div>
            <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-mono">
              {officers.length} Registered
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="pb-3">Badge &amp; Name</th>
                  <th className="pb-3">Rank &amp; Station</th>
                  <th className="pb-3">Contact</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {officers.map((officer) => (
                  <tr key={officer.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3">
                      <strong className="text-white block font-medium">
                        {officer.full_name || officer.username}
                      </strong>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {officer.badge_number || `ID-${officer.id}`}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-slate-200 block">{officer.rank || 'Investigator'}</span>
                      <span className="text-slate-400 text-[11px]">{officer.station_name || 'Precinct HQ'}</span>
                    </td>
                    <td className="py-3 text-slate-300 font-mono text-[11px]">
                      {officer.email}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        officer.role === 'Administrator' ? 'bg-purple-950 text-purple-300 border border-purple-800/40' : 'bg-blue-950 text-blue-300 border border-blue-800/40'
                      }`}>
                        {officer.role}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        officer.is_active ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40' : 'bg-red-950 text-red-300 border border-red-800/40'
                      }`}>
                        {officer.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {officer.role !== 'Administrator' && (
                        <button
                          onClick={() => handleToggleStatus(officer.id, officer.is_active)}
                          className={`text-[11px] font-medium px-2.5 py-1 rounded transition border ${
                            officer.is_active
                              ? 'bg-red-950/40 hover:bg-red-900/60 text-red-300 border-red-800/40'
                              : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/40'
                          }`}
                        >
                          {officer.is_active ? 'Suspend' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
