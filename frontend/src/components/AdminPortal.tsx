import React, { useState, useEffect } from 'react';
import {
  Shield, Users, Building2, FolderKanban, Database,
  ScrollText, Activity, LogOut, Search, Plus, CheckCircle2, XCircle,
  AlertTriangle, RefreshCw, KeyRound, Trash2,
  UploadCloud, Eye
} from 'lucide-react';
import { api } from '../services/api';
import type { AdminStats, PoliceStation, User, AuditLogItem } from '../types';

interface AdminPortalProps {
  currentTab?: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  currentUser: User;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  currentTab = 'dashboard',
  onNavigate,
  onLogout,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState(currentTab);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [officers, setOfficers] = useState<User[]>([]);
  const [stations, setStations] = useState<PoliceStation[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [ragDocs, setRagDocs] = useState<any[]>([]);
  const [datasetSummary, setDatasetSummary] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search/Filter states
  const [officerSearch, setOfficerSearch] = useState('');
  const [officerStatusFilter, setOfficerStatusFilter] = useState('');
  const [stationSearch, setStationSearch] = useState('');
  const [caseSearch, setCaseSearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');

  // Modals
  const [showCreateOfficerModal, setShowCreateOfficerModal] = useState(false);
  const [showCreateStationModal, setShowCreateStationModal] = useState(false);
  const [showResetPwModal, setShowResetPwModal] = useState<User | null>(null);
  const [showAssignOfficerModal, setShowAssignOfficerModal] = useState<any | null>(null);

  // Forms
  const [newOfficerForm, setNewOfficerForm] = useState({
    full_name: '',
    badge_number: '',
    username: '',
    email: '',
    phone: '',
    rank: 'Inspector',
    station_id: undefined as number | undefined,
    password: '',
    status: 'ACTIVE'
  });

  const [newStationForm, setNewStationForm] = useState({
    name: '',
    code: '',
    district: 'Kolkata South',
    state: 'West Bengal',
    address: '',
    latitude: 22.5726,
    longitude: 88.3639,
    contact: '+91 33 2200 0000',
    jurisdiction: 'Sector Jurisdiction',
    status: 'ACTIVE'
  });

  const [newPassword, setNewPassword] = useState('');
  const [datasetValidation, setDatasetValidation] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'dashboard') {
        const [s, h, ds] = await Promise.all([
          api.admin.getStats().catch(() => null),
          api.admin.getHealth().catch(() => null),
          api.apiRequest<any>('/admin/dataset/summary').catch(() => null)
        ]);
        if (s) setStats(s);
        if (h) setHealth(h);
        if (ds) setDatasetSummary(ds);
      } else if (activeTab === 'officers') {
        const [offs, sts] = await Promise.all([
          api.admin.listOfficers({ q: officerSearch, status: officerStatusFilter }),
          api.stations.list()
        ]);
        setOfficers(offs);
        setStations(sts);
      } else if (activeTab === 'stations') {
        const sts = await api.stations.list({ q: stationSearch });
        setStations(sts);
      } else if (activeTab === 'cases') {
        const [cs, offs, sts] = await Promise.all([
          api.admin.listCases({ q: caseSearch }),
          api.admin.listOfficers(),
          api.stations.list()
        ]);
        setCases(cs);
        setOfficers(offs);
        setStations(sts);
      } else if (activeTab === 'rag') {
        const [docs, ds] = await Promise.all([
          api.admin.listRAGDocuments(),
          api.apiRequest<any>('/admin/dataset/summary').catch(() => null)
        ]);
        setRagDocs(docs);
        if (ds) setDatasetSummary(ds);
      } else if (activeTab === 'audit-logs') {
        const logs = await api.admin.listAuditLogs({ action: auditSearch });
        setAuditLogs(logs);
      } else if (activeTab === 'health') {
        const h = await api.admin.getHealth();
        setHealth(h);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // --- Officer Actions ---
  const handleCreateOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const station = stations.find((s) => s.id === Number(newOfficerForm.station_id));
      await api.admin.createOfficer({
        ...newOfficerForm,
        station_id: newOfficerForm.station_id ? Number(newOfficerForm.station_id) : undefined,
        station_name: station ? station.name : undefined
      });
      setShowCreateOfficerModal(false);
      setSuccessMsg(`Officer ${newOfficerForm.full_name} created successfully.`);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create officer');
    }
  };

  const handleToggleOfficerStatus = async (officer: User) => {
    try {
      if (officer.is_active) {
        await api.admin.deactivateOfficer(officer.id);
        setSuccessMsg(`Officer ${officer.username} deactivated.`);
      } else {
        await api.admin.activateOfficer(officer.id);
        setSuccessMsg(`Officer ${officer.username} activated.`);
      }
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResetPwModal) return;
    try {
      await api.admin.resetOfficerPassword(showResetPwModal.id, newPassword);
      setShowResetPwModal(null);
      setNewPassword('');
      setSuccessMsg(`Password reset for ${showResetPwModal.username}.`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // --- Station Actions ---
  const handleCreateStation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.stations.create(newStationForm as any);
      setShowCreateStationModal(false);
      setSuccessMsg(`Station ${newStationForm.name} registered.`);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleStationStatus = async (station: PoliceStation) => {
    try {
      if (station.status === 'ACTIVE') {
        await api.stations.deactivate(station.id);
      } else {
        await api.stations.activate(station.id);
      }
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // --- Case Assignment Actions ---
  const handleAssignOfficer = async (caseId: number, officerId: number, stationId?: number) => {
    try {
      await api.admin.assignCaseOfficer(caseId, officerId, stationId);
      setShowAssignOfficerModal(null);
      setSuccessMsg('Case assigned successfully.');
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // --- Dataset Actions ---
  const handleValidateDataset = async () => {
    try {
      setLoading(true);
      const res = await api.apiRequest<any>('/admin/dataset/validate', { method: 'POST' });
      setDatasetValidation(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportDataset = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.apiRequest<any>('/admin/dataset/import', { method: 'POST' });
      setImportResult(res);
      setSuccessMsg(`Successfully imported ${res.successfully_imported} cases from synthetic dataset!`);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRollbackDataset = async () => {
    if (!window.confirm('Are you sure you want to rollback all synthetic dataset cases?')) return;
    try {
      setLoading(true);
      await api.apiRequest<any>('/admin/dataset/rollback', { method: 'POST' });
      setSuccessMsg('Synthetic dataset records rolled back successfully.');
      setImportResult(null);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'officers', label: 'Police Officers', icon: Users },
    { id: 'stations', label: 'Police Stations', icon: Building2 },
    { id: 'cases', label: 'Case Access & Assignment', icon: FolderKanban },
    { id: 'rag', label: 'RAG / Dataset Management', icon: Database },
    { id: 'audit-logs', label: 'Audit Logs', icon: ScrollText },
    { id: 'health', label: 'System Health', icon: RefreshCw },
  ];

  return (
    <div className="admin-portal-wrapper">
      {/* Sidebar matching Section 10 of PDF */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="brand-badge admin-theme">
            <Shield size={18} />
          </div>
          <div>
            <b>INVESTRA</b>
            <span className="sidebar-sub">SYSTEM CONTROL</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-btn ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(item.id);
                  onNavigate(`/admin/${item.id}`);
                }}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar admin-avatar">AD</div>
          <div className="user-details">
            <b>{currentUser.full_name || currentUser.username}</b>
            <span>Chief Administrator</span>
          </div>
          <button className="logout-btn" onClick={onLogout} title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        {/* Top Header */}
        <header className="admin-topbar">
          <div>
            <span className="badge badge-admin">ADMINISTRATION PORTAL</span>
            <h1>{sidebarItems.find((i) => i.id === activeTab)?.label}</h1>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-outline" onClick={loadData} title="Refresh Data">
              <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="alert alert-danger">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* --- TAB 1: DASHBOARD --- */}
        {activeTab === 'dashboard' && stats && (
          <div className="tab-pane">
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Total Police Officers</span>
                <div className="stat-value">{stats.total_police_officers}</div>
                <div className="stat-meta text-success">{stats.active_officers} Active · {stats.inactive_officers} Inactive</div>
              </div>
              <div className="stat-card">
                <span className="stat-label">Police Stations</span>
                <div className="stat-value">{stats.total_stations}</div>
                <div className="stat-meta text-primary">{stats.active_stations} Active Precincts</div>
              </div>
              <div className="stat-card">
                <span className="stat-label">Total Cases (FIRs)</span>
                <div className="stat-value">{stats.total_cases}</div>
                <div className="stat-meta text-warning">{stats.open_cases} Open · {stats.closed_cases} Closed</div>
              </div>
              <div className="stat-card">
                <span className="stat-label">Dataset & RAG Status</span>
                <div className="stat-value">{datasetSummary?.is_imported ? '15 Cases' : '0 Cases'}</div>
                <div className="stat-meta">
                  {datasetSummary?.is_imported ? '✓ Synthetic Crime Dataset Imported' : 'Dataset not imported yet'}
                </div>
              </div>
            </div>

            {/* Quick Actions & Dataset Status Banner */}
            <div className="card dashboard-banner" style={{ marginTop: '20px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3>Synthetic Crime Dataset Management (Kolkata)</h3>
                  <p className="text-muted">
                    {datasetSummary?.is_imported
                      ? `Dataset is live in database with ${datasetSummary.imported_cases_count} cases, ${datasetSummary.entities_count} entities, and ${datasetSummary.evidence_records_count} evidence records.`
                      : 'Load the 15 synthetic Kolkata crime records with full suspects, witnesses, evidence descriptions, and timeline events.'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {!datasetSummary?.is_imported ? (
                    <button className="btn btn-primary" onClick={handleImportDataset} disabled={loading}>
                      <UploadCloud size={16} /> Import Dataset Now
                    </button>
                  ) : (
                    <button className="btn btn-outline" onClick={handleRollbackDataset} disabled={loading}>
                      <Trash2 size={16} /> Rollback Dataset
                    </button>
                  )}
                  <button className="btn btn-secondary" onClick={() => setActiveTab('rag')}>
                    Manage RAG / Dataset →
                  </button>
                </div>
              </div>
            </div>

            {/* Recent System Activity */}
            <div className="card" style={{ marginTop: '20px' }}>
              <div className="card-header">
                <h3>Recent System Activity Audit</h3>
                <span className="badge badge-secondary">{stats.recent_system_activity.length} recent logs</span>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>Actor</th>
                      <th>Detail</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_system_activity.map((log) => (
                      <tr key={log.id}>
                        <td className="text-muted">{new Date(log.timestamp).toLocaleTimeString()}</td>
                        <td><span className="tag tag-action">{log.action}</span></td>
                        <td><b>{log.actor}</b></td>
                        <td>{log.detail}</td>
                        <td>
                          <span className={`badge badge-${log.result === 'SUCCESS' ? 'success' : 'danger'}`}>
                            {log.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!stats.recent_system_activity.length && (
                      <tr><td colSpan={5} className="text-center text-muted">No recent activity logs recorded.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: POLICE OFFICERS --- */}
        {activeTab === 'officers' && (
          <div className="tab-pane">
            <div className="table-toolbar">
              <div className="search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search officers by name, username, badge ID..."
                  value={officerSearch}
                  onChange={(e) => setOfficerSearch(e.target.value)}
                />
              </div>
              <div className="toolbar-filters">
                <select value={officerStatusFilter} onChange={(e) => setOfficerStatusFilter(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
                <button className="btn btn-primary" onClick={() => setShowCreateOfficerModal(true)}>
                  <Plus size={16} /> Create Police Officer
                </button>
              </div>
            </div>

            <div className="card">
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Badge ID</th>
                      <th>Name / Username</th>
                      <th>Rank</th>
                      <th>Assigned Station</th>
                      <th>Contact Email / Phone</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {officers.map((off) => (
                      <tr key={off.id}>
                        <td><b>{off.badge_number || `POL-${off.id}`}</b></td>
                        <td>
                          <div><b>{off.full_name || off.username}</b></div>
                          <small className="text-muted">@{off.username}</small>
                        </td>
                        <td>{off.rank || 'Investigating Officer'}</td>
                        <td>{off.station_name || 'Unassigned'}</td>
                        <td>
                          <div>{off.email}</div>
                          {off.phone && <small className="text-muted">{off.phone}</small>}
                        </td>
                        <td>
                          <span className={`badge badge-${off.is_active ? 'success' : 'danger'}`}>
                            {off.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons-cell">
                            <button
                              className="btn-icon"
                              title={off.is_active ? 'Deactivate Account' : 'Activate Account'}
                              onClick={() => handleToggleOfficerStatus(off)}
                            >
                              {off.is_active ? <XCircle size={16} className="text-danger" /> : <CheckCircle2 size={16} className="text-success" />}
                            </button>
                            <button
                              className="btn-icon"
                              title="Reset Password"
                              onClick={() => setShowResetPwModal(off)}
                            >
                              <KeyRound size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!officers.length && (
                      <tr><td colSpan={7} className="text-center text-muted">No officers found matching criteria.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 3: POLICE STATIONS --- */}
        {activeTab === 'stations' && (
          <div className="tab-pane">
            <div className="table-toolbar">
              <div className="search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search stations by name, code, district..."
                  value={stationSearch}
                  onChange={(e) => setStationSearch(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={() => setShowCreateStationModal(true)}>
                <Plus size={16} /> Register Police Station
              </button>
            </div>

            <div className="card">
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Station Code</th>
                      <th>Station Name</th>
                      <th>District</th>
                      <th>Address</th>
                      <th>Coordinates</th>
                      <th>Officers</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stations.map((st) => (
                      <tr key={st.id}>
                        <td><b>{st.code}</b></td>
                        <td><b>{st.name}</b></td>
                        <td>{st.district}</td>
                        <td>{st.address}</td>
                        <td><small>{st.latitude.toFixed(4)}, {st.longitude.toFixed(4)}</small></td>
                        <td><span className="badge badge-primary">{st.officers_count || 0} Officers</span></td>
                        <td>
                          <span className={`badge badge-${st.status === 'ACTIVE' ? 'success' : 'secondary'}`}>
                            {st.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-icon"
                            onClick={() => handleToggleStationStatus(st)}
                            title={st.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          >
                            {st.status === 'ACTIVE' ? <XCircle size={16} className="text-danger" /> : <CheckCircle2 size={16} className="text-success" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 4: CASE ACCESS & ASSIGNMENT --- */}
        {activeTab === 'cases' && (
          <div className="tab-pane">
            <div className="table-toolbar">
              <div className="search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search all system cases by reference, title, crime type..."
                  value={caseSearch}
                  onChange={(e) => setCaseSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="card">
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Case / FIR Number</th>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Station</th>
                      <th>Assigned Officer</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((c) => (
                      <tr key={c.id}>
                        <td><b>{c.fir_number || c.case_number}</b></td>
                        <td><b>{c.title}</b></td>
                        <td>{c.crime_type}</td>
                        <td>{c.police_station}</td>
                        <td>{c.assigned_officer || 'Unassigned'}</td>
                        <td>
                          <span className={`badge badge-${c.status === 'OPEN' ? 'primary' : c.status === 'CLOSED' ? 'success' : 'warning'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => setShowAssignOfficerModal(c)}
                          >
                            Reassign Officer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 5: RAG / DATASET MANAGEMENT --- */}
        {activeTab === 'rag' && (
          <div className="tab-pane">
            {/* Dataset Importer Panel matching Sections 2-4 of PDF */}
            <div className="card" style={{ marginBottom: '20px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2>Kolkata Synthetic Crime Dataset Integration</h2>
                  <p className="text-muted">
                    15 records across 22 structured columns (victims, suspects, witnesses, physical evidence descriptions, and chronological timelines).
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-outline" onClick={handleValidateDataset} disabled={loading}>
                    <Eye size={16} /> Validate CSV
                  </button>
                  {!datasetSummary?.is_imported ? (
                    <button className="btn btn-primary" onClick={handleImportDataset} disabled={loading}>
                      <UploadCloud size={16} /> Execute Full Import
                    </button>
                  ) : (
                    <button className="btn btn-danger" onClick={handleRollbackDataset} disabled={loading}>
                      <Trash2 size={16} /> Rollback Imported Dataset
                    </button>
                  )}
                </div>
              </div>

              {/* Validation Preview Box */}
              {datasetValidation && (
                <div className="validation-box" style={{ marginTop: '16px', background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
                  <h4>CSV Structure Validation Result: <span className="text-success">✓ VALID</span></h4>
                  <p>Total Rows: <b>{datasetValidation.total_rows}</b> | Valid: <b>{datasetValidation.valid_rows}</b> | Errors: <b>{datasetValidation.errors.length}</b></p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    {datasetValidation.preview.map((p: any) => (
                      <div key={p.report_number} className="badge badge-secondary">
                        {p.report_number} · {p.crime_description}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Import Results Box */}
              {importResult && (
                <div className="validation-box" style={{ marginTop: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '8px' }}>
                  <h4 className="text-success">✓ Import Completed Successfully</h4>
                  <div className="stats-grid" style={{ marginTop: '12px' }}>
                    <div><b>Cases Created:</b> {importResult.cases_created}</div>
                    <div><b>Victims:</b> {importResult.victims_created}</div>
                    <div><b>Suspects:</b> {importResult.suspects_created}</div>
                    <div><b>Witnesses:</b> {importResult.witnesses_created}</div>
                    <div><b>Evidence Records:</b> {importResult.evidence_records_created}</div>
                    <div><b>RAG Embeddings:</b> {importResult.embeddings}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Indexed RAG Documents Table */}
            <div className="card">
              <div className="card-header">
                <h3>Indexed RAG Knowledge Documents & Evidence Chunks</h3>
                <span className="badge badge-primary">{ragDocs.length} Total Documents</span>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Document Title</th>
                      <th>Source Type</th>
                      <th>SHA-256 Hash</th>
                      <th>Chunks</th>
                      <th>Vector Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ragDocs.map((doc) => (
                      <tr key={doc.id}>
                        <td><b>{doc.title}</b></td>
                        <td><span className="tag tag-action">{doc.source_type}</span></td>
                        <td><code>{doc.document_hash.slice(0, 16)}...</code></td>
                        <td>{doc.chunks_count} chunks ({doc.embedded_chunks} embedded)</td>
                        <td>
                          <span className={`badge badge-${doc.rag_ready ? 'success' : 'warning'}`}>
                            {doc.rag_ready ? 'RAG READY' : 'INDEXING'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={async () => {
                              try {
                                await api.admin.reindexRAGDocument(doc.id);
                                setSuccessMsg(`Document ${doc.id} reindexed.`);
                                loadData();
                              } catch (e: any) {
                                setError(e.message);
                              }
                            }}
                          >
                            Re-index
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!ragDocs.length && (
                      <tr><td colSpan={6} className="text-center text-muted">No RAG documents indexed yet. Import dataset or upload evidence to populate index.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 6: AUDIT LOGS --- */}
        {activeTab === 'audit-logs' && (
          <div className="tab-pane">
            <div className="table-toolbar">
              <div className="search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Filter logs by action name (e.g. LOGIN, CASE_REGISTERED, EVIDENCE_UPLOADED)..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="card">
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>User / Actor</th>
                      <th>Action</th>
                      <th>Target Resource</th>
                      <th>Details</th>
                      <th>IP Address</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="text-muted">{new Date(log.created_at || log.timestamp || '').toLocaleString()}</td>
                        <td><b>{log.user || log.actor}</b></td>
                        <td><span className="tag tag-action">{log.action}</span></td>
                        <td>{log.resource || (log.case_id ? `Case #${log.case_id}` : 'System')}</td>
                        <td>{log.detail}</td>
                        <td><small>{log.ip_address || '127.0.0.1'}</small></td>
                        <td>
                          <span className={`badge badge-${log.result === 'SUCCESS' ? 'success' : 'danger'}`}>
                            {log.result || 'SUCCESS'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 7: SYSTEM HEALTH --- */}
        {activeTab === 'health' && health && (
          <div className="tab-pane">
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Database Engine</span>
                <div className="stat-value text-success">{health.database}</div>
                <div className="stat-meta">{health.details?.database}</div>
              </div>
              <div className="stat-card">
                <span className="stat-label">Evidence Storage</span>
                <div className="stat-value text-success">{health.storage}</div>
                <div className="stat-meta">{health.details?.storage}</div>
              </div>
              <div className="stat-card">
                <span className="stat-label">Ollama AI / LLM Engine</span>
                <div className={`stat-value text-${health.ollama === 'UP' ? 'success' : 'warning'}`}>
                  {health.ollama}
                </div>
                <div className="stat-meta">{health.details?.ollama}</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- MODAL: Create Officer --- */}
      {showCreateOfficerModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Create Police Officer Account</h3>
              <button className="btn-icon" onClick={() => setShowCreateOfficerModal(false)}><XCircle size={18} /></button>
            </div>
            <form onSubmit={handleCreateOfficer}>
              <div className="modal-body">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      required
                      value={newOfficerForm.full_name}
                      onChange={(e) => setNewOfficerForm({ ...newOfficerForm, full_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Badge Number *</label>
                    <input
                      type="text"
                      required
                      value={newOfficerForm.badge_number}
                      onChange={(e) => setNewOfficerForm({ ...newOfficerForm, badge_number: e.target.value })}
                      placeholder="e.g. POL-1042"
                    />
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Username *</label>
                    <input
                      type="text"
                      required
                      value={newOfficerForm.username}
                      onChange={(e) => setNewOfficerForm({ ...newOfficerForm, username: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      required
                      value={newOfficerForm.email}
                      onChange={(e) => setNewOfficerForm({ ...newOfficerForm, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      value={newOfficerForm.phone}
                      onChange={(e) => setNewOfficerForm({ ...newOfficerForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Rank</label>
                    <select
                      value={newOfficerForm.rank}
                      onChange={(e) => setNewOfficerForm({ ...newOfficerForm, rank: e.target.value })}
                    >
                      <option>Inspector</option>
                      <option>Sub-Inspector</option>
                      <option>Assistant Sub-Inspector</option>
                      <option>Investigating Officer</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Assigned Police Station *</label>
                  <select
                    required
                    value={newOfficerForm.station_id || ''}
                    onChange={(e) => setNewOfficerForm({ ...newOfficerForm, station_id: Number(e.target.value) })}
                  >
                    <option value="">Select a Police Station</option>
                    {stations.map((st) => (
                      <option key={st.id} value={st.id}>{st.name} ({st.code})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Initial Department Password *</label>
                  <input
                    type="password"
                    required
                    minLength={12}
                    value={newOfficerForm.password}
                    onChange={(e) => setNewOfficerForm({ ...newOfficerForm, password: e.target.value })}
                    placeholder="Min 12 characters"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateOfficerModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Officer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: Create Station --- */}
      {showCreateStationModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Register Police Station</h3>
              <button className="btn-icon" onClick={() => setShowCreateStationModal(false)}><XCircle size={18} /></button>
            </div>
            <form onSubmit={handleCreateStation}>
              <div className="modal-body">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Station Name *</label>
                    <input
                      type="text"
                      required
                      value={newStationForm.name}
                      onChange={(e) => setNewStationForm({ ...newStationForm, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Station Code *</label>
                    <input
                      type="text"
                      required
                      value={newStationForm.code}
                      onChange={(e) => setNewStationForm({ ...newStationForm, code: e.target.value })}
                      placeholder="e.g. PS-SLC-01"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>District *</label>
                  <input
                    type="text"
                    required
                    value={newStationForm.district}
                    onChange={(e) => setNewStationForm({ ...newStationForm, district: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Physical Address *</label>
                  <input
                    type="text"
                    required
                    value={newStationForm.address}
                    onChange={(e) => setNewStationForm({ ...newStationForm, address: e.target.value })}
                  />
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={newStationForm.latitude}
                      onChange={(e) => setNewStationForm({ ...newStationForm, latitude: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={newStationForm.longitude}
                      onChange={(e) => setNewStationForm({ ...newStationForm, longitude: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateStationModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Register Station</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: Reset Password --- */}
      {showResetPwModal && (
        <div className="modal-overlay">
          <div className="modal-card modal-sm">
            <div className="modal-header">
              <h3>Reset Password: {showResetPwModal.username}</h3>
              <button className="btn-icon" onClick={() => setShowResetPwModal(null)}><XCircle size={18} /></button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="modal-body">
                <div className="form-group">
                  <label>New Secure Password *</label>
                  <input
                    type="password"
                    required
                    minLength={12}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 12 characters"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowResetPwModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: Reassign Case Officer --- */}
      {showAssignOfficerModal && (
        <div className="modal-overlay">
          <div className="modal-card modal-sm">
            <div className="modal-header">
              <h3>Assign Investigating Officer</h3>
              <button className="btn-icon" onClick={() => setShowAssignOfficerModal(null)}><XCircle size={18} /></button>
            </div>
            <div className="modal-body">
              <p>Case: <b>{showAssignOfficerModal.fir_number || showAssignOfficerModal.case_number}</b></p>
              <div className="form-group">
                <label>Select Investigating Officer</label>
                <select id="reassign-officer-select">
                  {officers.filter((o) => o.is_active).map((off) => (
                    <option key={off.id} value={off.id}>{off.full_name || off.username} ({off.badge_number}) — {off.station_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowAssignOfficerModal(null)}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const sel = (document.getElementById('reassign-officer-select') as HTMLSelectElement).value;
                  handleAssignOfficer(showAssignOfficerModal.id, Number(sel));
                }}
              >
                Save Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
