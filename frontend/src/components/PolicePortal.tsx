import React, { useState, useEffect } from 'react';
import {
  Shield, Plus, FolderKanban, FileSpreadsheet,
  LogOut, Search, AlertTriangle, Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import type { Case, PoliceDashboardStats, User } from '../types';

interface PolicePortalProps {
  currentTab?: 'dashboard' | 'cases';
  onNavigate: (path: string) => void;
  onLogout: () => void;
  currentUser: User;
}

export const PolicePortal: React.FC<PolicePortalProps> = ({
  currentTab = 'dashboard',
  onNavigate,
  onLogout,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cases'>(currentTab);
  const [stats, setStats] = useState<PoliceDashboardStats | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'dashboard') {
        const [s, cList] = await Promise.all([
          api.cases.getDashboardStats().catch(() => null),
          api.cases.list()
        ]);
        if (s) setStats(s);
        setCases(cList);
      } else {
        const cList = await api.cases.list({
          q: searchQuery,
          status: statusFilter !== 'ALL' ? statusFilter : undefined
        });
        setCases(cList);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load police data');
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases;

  return (
    <div className="police-portal-wrapper">
      {/* Navigation Header */}
      <header className="police-top-navbar">
        <div className="navbar-brand" onClick={() => onNavigate('/police/dashboard')}>
          <div className="brand-badge police-theme">
            <Shield size={18} />
          </div>
          <div className="brand-text">
            <b>INVESTRA</b>
            <span>POLICE INVESTIGATION WORKSPACE</span>
          </div>
        </div>

        <nav className="navbar-nav">
          <button
            className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('dashboard');
              onNavigate('/police/dashboard');
            }}
          >
            Dashboard
          </button>
          <button
            className={`nav-link ${activeTab === 'cases' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('cases');
              onNavigate('/police/cases');
            }}
          >
            Assigned Cases
          </button>
          <button className="nav-link btn-link-action" onClick={() => onNavigate('/police/cases/new')}>
            <Plus size={15} /> New FIR / Case
          </button>
        </nav>

        <div className="navbar-user">
          <div className="user-avatar police-avatar">
            {(currentUser.full_name || currentUser.username).slice(0, 2).toUpperCase()}
          </div>
          <div className="user-details">
            <b>{currentUser.full_name || currentUser.username}</b>
            <span>{currentUser.rank || 'Officer'} · {currentUser.station_name}</span>
          </div>
          <button className="logout-btn" onClick={onLogout} title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="police-main-container">
        {loading && (
          <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '8px', color: '#93c5fd', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} className="spin" /> Refreshing case records and precinct feeds...
          </div>
        )}
        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* --- POLICE DASHBOARD (Page 11 of PDF) --- */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-content">
            <div className="dashboard-head">
              <div>
                <span className="badge badge-primary">OFFICER DASHBOARD</span>
                <h1>Welcome, {currentUser.full_name || currentUser.username}</h1>
                <p className="text-muted">Assigned Precinct: <b>{currentUser.station_name}</b> · Badge: <b>{currentUser.badge_number || `POL-${currentUser.id}`}</b></p>
              </div>
              <button className="btn btn-primary btn-lg" onClick={() => onNavigate('/police/cases/new')}>
                <Plus size={18} /> New FIR / Case
              </button>
            </div>

            {/* Metrics */}
            <div className="stats-grid" style={{ marginTop: '20px' }}>
              <div className="stat-card">
                <span className="stat-label">My Assigned Cases</span>
                <div className="stat-value">{stats ? stats.my_assigned_cases : cases.length}</div>
                <div className="stat-meta text-primary">Authorized investigations</div>
              </div>
              <div className="stat-card">
                <span className="stat-label">Open Cases</span>
                <div className="stat-value text-primary">
                  {stats ? stats.open_cases : cases.filter((c) => c.status === 'OPEN' || c.status === 'REGISTERED').length}
                </div>
                <div className="stat-meta">Pending investigation review</div>
              </div>
              <div className="stat-card">
                <span className="stat-label">Under Investigation</span>
                <div className="stat-value text-warning">
                  {stats ? stats.cases_under_investigation : cases.filter((c) => c.status === 'UNDER_INVESTIGATION').length}
                </div>
                <div className="stat-meta">Active forensic inquiry</div>
              </div>
              <div className="stat-card">
                <span className="stat-label">Recent Evidence Ingested</span>
                <div className="stat-value text-success">
                  {stats ? stats.recent_evidence_count : '—'}
                </div>
                <div className="stat-meta">Indexed for RAG analysis</div>
              </div>
            </div>

            {/* Quick Actions Bar matching Section 11 of PDF */}
            <div className="quick-actions-bar card" style={{ marginTop: '24px', padding: '20px' }}>
              <h3>Quick Officer Actions</h3>
              <div className="quick-actions-grid">
                <button className="quick-action-item" onClick={() => onNavigate('/police/cases/new')}>
                  <div className="q-icon bg-blue"><Plus size={20} /></div>
                  <b>+ New FIR / Case</b>
                  <span>8-Step registration wizard</span>
                </button>
                <button className="quick-action-item" onClick={() => { setActiveTab('cases'); onNavigate('/police/cases'); }}>
                  <div className="q-icon bg-indigo"><FolderKanban size={20} /></div>
                  <b>View Assigned Cases</b>
                  <span>Filter & track status</span>
                </button>
                <button className="quick-action-item" onClick={() => {
                  if (cases.length > 0) onNavigate(`/police/cases/${cases[0].id}`);
                }}>
                  <div className="q-icon bg-purple"><Sparkles size={20} /></div>
                  <b>AI Case Assistant</b>
                  <span>Evidence-grounded RAG</span>
                </button>
                <button className="quick-action-item" onClick={() => {
                  if (cases.length > 0) onNavigate(`/police/cases/${cases[0].id}`);
                }}>
                  <div className="q-icon bg-emerald"><FileSpreadsheet size={20} /></div>
                  <b>Generate Report</b>
                  <span>Official case report</span>
                </button>
              </div>
            </div>

            {/* Assigned Cases List */}
            <div className="card" style={{ marginTop: '24px' }}>
              <div className="card-header">
                <h3>My Active Investigation Cases</h3>
                <button className="btn btn-sm btn-outline" onClick={() => { setActiveTab('cases'); onNavigate('/police/cases'); }}>
                  View All Cases →
                </button>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Case / FIR Number</th>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Location</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.slice(0, 6).map((c) => (
                      <tr key={c.id}>
                        <td><b>{c.fir_number || c.case_number}</b></td>
                        <td><b>{c.title}</b></td>
                        <td>{c.crime_type}</td>
                        <td><small>{c.incident_location}</small></td>
                        <td>
                          <span className={`badge badge-${c.priority === 'HIGH' ? 'danger' : 'secondary'}`}>
                            {c.priority}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${c.status === 'OPEN' ? 'primary' : c.status === 'CLOSED' ? 'success' : 'warning'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => onNavigate(`/police/cases/${c.id}`)}
                          >
                            Open Workspace →
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!cases.length && (
                      <tr>
                        <td colSpan={7} className="text-center text-muted" style={{ padding: '30px' }}>
                          No cases assigned to your account yet. Click "+ New FIR / Case" to start your first investigation.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- ASSIGNED CASES LIST TAB --- */}
        {activeTab === 'cases' && (
          <div className="cases-list-content">
            <div className="dashboard-head">
              <div>
                <span className="badge badge-primary">AUTHORIZED CASES</span>
                <h1>Case Directory</h1>
                <p className="text-muted">Displaying cases assigned to your credentials and authorized precinct.</p>
              </div>
              <button className="btn btn-primary" onClick={() => onNavigate('/police/cases/new')}>
                <Plus size={16} /> New FIR / Case
              </button>
            </div>

            {/* Filter bar */}
            <div className="table-toolbar" style={{ marginTop: '20px' }}>
              <div className="search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search by FIR/Case number, title, suspect, witness, evidence keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadData()}
                />
              </div>

              <div className="toolbar-filters">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">OPEN</option>
                  <option value="UNDER_INVESTIGATION">UNDER_INVESTIGATION</option>
                  <option value="ON_HOLD">ON_HOLD</option>
                  <option value="CLOSED">CLOSED</option>
                </select>

                <button className="btn btn-outline" onClick={loadData}>
                  Search
                </button>
              </div>
            </div>

            {/* Cases Grid */}
            <div className="card">
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>FIR / Case #</th>
                      <th>Crime Description</th>
                      <th>Category</th>
                      <th>Location / Scene</th>
                      <th>Registered Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.map((c) => (
                      <tr key={c.id}>
                        <td><b>{c.fir_number || c.case_number}</b></td>
                        <td>
                          <b>{c.title}</b>
                          {c.source_dataset && <span className="tag tag-role" style={{ marginLeft: '6px' }}>SYNTHETIC DATASET</span>}
                        </td>
                        <td>{c.crime_type}</td>
                        <td><small>{c.incident_location}</small></td>
                        <td><small className="text-muted">{new Date(c.fir_date || c.created_at).toLocaleDateString()}</small></td>
                        <td>
                          <span className={`badge badge-${c.status === 'OPEN' ? 'primary' : c.status === 'CLOSED' ? 'success' : 'warning'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => onNavigate(`/police/cases/${c.id}`)}
                          >
                            Open Workspace
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!filteredCases.length && (
                      <tr><td colSpan={7} className="text-center text-muted" style={{ padding: '30px' }}>No authorized cases found matching query.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
