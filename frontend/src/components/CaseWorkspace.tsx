import React, { useState, useEffect } from 'react';
import {
  FileText, Users, Database, Network, Clock, FileCheck,
  Activity, ArrowLeft, Plus, Download, RefreshCw, Send, ShieldCheck,
  AlertTriangle, CheckCircle2, MapPin, Eye, Upload, Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import type { Case, TimelineEvent, GraphData, User } from '../types';

interface CaseWorkspaceProps {
  caseId: number;
  onNavigate: (path: string) => void;
  currentUser?: User;
}

export const CaseWorkspace: React.FC<CaseWorkspaceProps> = ({ caseId, onNavigate, currentUser: _currentUser }) => {
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Tab data states
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [reportData, setReportData] = useState<any>(null);
  const [reportDownloading, setReportDownloading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState('');
  const [graphSearch, setGraphSearch] = useState('');
  const [selectedGraphNode, setSelectedGraphNode] = useState<GraphData['nodes'][number] | null>(null);

  // Modals & form states
  const [viewEvidenceModal, setViewEvidenceModal] = useState<any | null>(null);
  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [showAddRelModal, setShowAddRelModal] = useState(false);
  const [showUploadEvidenceModal, setShowUploadEvidenceModal] = useState(false);

  // Sub-forms
  const [newPersonForm, setNewPersonForm] = useState({ name: '', role: 'SUSPECT', notes: '' });
  const [newRelForm, setNewRelForm] = useState({ source_id: 0, target_id: 0, type: 'SUSPECT_IN' });
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  // Coordination form
  const [coordStationName, setCoordStationName] = useState('Electronics Complex Police Station');
  const [coordReqBody, setCoordReqBody] = useState('');
  const [coordSuccess, setCoordSuccess] = useState('');

  // AI Assistant Chat state
  const [chatQuery, setChatQuery] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{
    query: string;
    answer: string;
    sources: any[];
    warning?: string;
  }[]>([]);

  useEffect(() => {
    loadCaseData();
  }, [caseId]);

  const loadCaseData = async () => {
    setLoading(true);
    setError('');
    try {
      const detail = await api.cases.getDetail(caseId);
      setData(detail);

      // Preload sub-data
      const [tl, gr, rep] = await Promise.all([
        api.cases.getTimeline(caseId).catch(() => []),
        api.cases.getGraph(caseId).catch(() => ({ nodes: [], edges: [] })),
        api.cases.getReport(caseId).catch(() => null)
      ]);
      setTimeline(tl);
      setGraphData(gr);
      setReportData(rep);
    } catch (err: any) {
      setError(err.message || 'Failed to load case data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.cases.update(caseId, { status: newStatus });
      setSuccessMsg(`Case status updated to ${newStatus}`);
      loadCaseData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.cases.addEntity(caseId, {
        entity_type: 'PERSON',
        value: newPersonForm.name,
        role: newPersonForm.role,
        metadata: { notes: newPersonForm.notes }
      });
      setShowAddPersonModal(false);
      setNewPersonForm({ name: '', role: 'SUSPECT', notes: '' });
      setSuccessMsg('Person entity recorded.');
      loadCaseData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.cases.addRelationship(caseId, {
        source_entity_id: Number(newRelForm.source_id),
        target_entity_id: Number(newRelForm.target_id),
        relationship_type: newRelForm.type
      });
      setShowAddRelModal(false);
      setSuccessMsg('Relationship linked.');
      loadCaseData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceFile) return;
    try {
      await api.documents.upload(caseId, evidenceFile);
      setShowUploadEvidenceModal(false);
      setEvidenceFile(null);
      setSuccessMsg('Evidence uploaded, hashed, and indexed.');
      loadCaseData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReindexEvidence = async (evidenceId: number) => {
    try {
      await api.documents.reindex(evidenceId);
      setSuccessMsg('Evidence reindexed.');
      loadCaseData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSendCoordination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coordReqBody.trim()) {
      setError('Specific intelligence or action required is required.');
      return;
    }
    try {
      const workspace = await api.coordination.getWorkspace(caseId);
      const station = workspace.recommendations?.find((item: any) => item.name === coordStationName);
      if (!station) {
        throw new Error('The selected station is not available in this case coordination workspace.');
      }
      const result = await api.coordination.sendDraft(caseId, [station.id], coordReqBody.trim());
      const request = result.requests?.[0];
      setCoordSuccess(request ? `Draft ${request.code} prepared for investigator approval.` : 'Coordination request draft prepared for investigator approval.');
      setCoordReqBody('');
      loadCaseData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim()) return;

    const q = chatQuery.trim();
    setChatQuery('');
    setChatLoading(true);

    try {
      const res = await api.assistant.ask(caseId, q);
      setChatHistory([
        ...chatHistory,
        {
          query: q,
          answer: res.answer,
          sources: res.sources || [],
          warning: res.warning
        }
      ]);
    } catch (err: any) {
      setChatHistory([
        ...chatHistory,
        {
          query: q,
          answer: 'Unable to process query at this time.',
          sources: [],
          warning: err.message
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    setReportDownloading(true);
    setReportSuccess('');
    try {
      const blob = await api.cases.downloadReportPdf(caseId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${c.fir_number || c.case_number}-report.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      setReportSuccess('Professional PDF generated and downloaded successfully.');
    } catch (err: any) {
      setError(err.message || 'Unable to generate the PDF report.');
    } finally {
      setReportDownloading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="workspace-loading">
        <RefreshCw size={24} className="spin" />
        <p>Loading authorized investigation workspace...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="workspace-error card" style={{ margin: '40px auto', maxWidth: '600px', padding: '30px' }}>
        <AlertTriangle size={32} className="text-danger" />
        <h2>Access Restricted / Error</h2>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => onNavigate('/police/cases')}>
          ← Back to Cases
        </button>
      </div>
    );
  }

  const c: Case = data.case;
  const entities: any[] = data.entities || [];
  const evidenceList: any[] = data.evidence || [];
  const graphNodeLabels = new Map(graphData.nodes.map((node) => [String(node.id), node.label]));

  const tabsList = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'fir', label: 'FIR', icon: ShieldCheck },
    { id: 'people', label: 'People', icon: Users },
    { id: 'evidence', label: 'Evidence', icon: Database },
    { id: 'entities', label: 'Entities', icon: Network },
    { id: 'graph', label: 'Graph', icon: Network },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'coordination', label: 'Coordination', icon: Users },
    { id: 'assistant', label: 'AI Assistant', icon: Sparkles },
    { id: 'reports', label: 'Reports', icon: FileCheck },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  return (
    <div className="case-workspace-container">
      {/* Workspace Header */}
      <div className="case-workspace-header">
        <div className="header-top">
          <button className="back-link" onClick={() => onNavigate('/police/cases')}>
            <ArrowLeft size={16} /> All Cases
          </button>
          <div className="header-badges">
            <span className={`badge badge-${c.priority === 'HIGH' ? 'danger' : 'secondary'}`}>
              {c.priority} PRIORITY
            </span>
            <select
              value={c.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="status-dropdown-select"
            >
              <option value="DRAFT">DRAFT</option>
              <option value="REGISTERED">REGISTERED</option>
              <option value="OPEN">OPEN</option>
              <option value="UNDER_INVESTIGATION">UNDER_INVESTIGATION</option>
              <option value="ON_HOLD">ON_HOLD</option>
              <option value="SUBMITTED_FOR_REVIEW">SUBMITTED_FOR_REVIEW</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>
        </div>

        <div className="header-main">
          <div>
            <span className="case-ref">{c.fir_number || c.case_number} · {c.crime_type}</span>
            <h1 className="case-title">{c.title}</h1>
            <div className="case-meta-row">
              <span><MapPin size={14} /> {c.incident_location}</span>
              <span>• Precinct: <b>{c.police_station}</b></span>
              <span>• IO: <b>{c.assigned_officer || c.created_by_officer}</b></span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="workspace-tabs-bar">
          {tabsList.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                className={`tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                <Icon size={15} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ margin: '16px 24px' }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Tab Content */}
      <div className="workspace-content-body">
        {/* --- TAB 1: OVERVIEW --- */}
        {activeTab === 'overview' && (
          <div className="tab-pane-content">
            <div className="overview-grid">
              <div className="card">
                <h3>Incident Summary</h3>
                <p>{c.description || 'No incident description recorded.'}</p>
                {c.additional_notes && (
                  <div style={{ marginTop: '14px', padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
                    <b>Additional Investigative Notes:</b>
                    <p style={{ margin: '4px 0 0', color: '#475569' }}>{c.additional_notes}</p>
                  </div>
                )}
              </div>

              <div className="card">
                <h3>Complainant Particulars</h3>
                <p><b>Name:</b> {c.complainant_name || 'Confidential'}</p>
                <p><b>Contact:</b> {c.complainant_contact || 'N/A'}</p>
                <p><b>Address:</b> {c.complainant_address || 'N/A'}</p>
                {c.complainant_statement && (
                  <p style={{ fontStyle: 'italic', marginTop: '10px' }}>"{c.complainant_statement}"</p>
                )}
              </div>

              <div className="card">
                <h3>Key Recorded Entities ({entities.length})</h3>
                <div className="entity-chips-container">
                  {entities.map((e) => (
                    <span key={e.id} className="tag tag-action">
                      {e.type}: <b>{e.value}</b> ({e.role})
                    </span>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3>Evidence Inventory ({evidenceList.length})</h3>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {evidenceList.map((ev) => (
                    <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                      <span><b>{ev.title}</b> ({ev.source_type})</span>
                      <small className="text-muted">{ev.processing_status}</small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: FIR --- */}
        {activeTab === 'fir' && (
          <div className="tab-pane-content">
            <div className="card official-fir-document">
              <div className="fir-header">
                <div className="fir-seal"><ShieldCheck size={36} /></div>
                <div>
                  <h2>FIRST INFORMATION REPORT</h2>
                  <small>(Under Section 154 Cr.P.C. / West Bengal Police Service)</small>
                </div>
              </div>

              <div className="fir-details-grid">
                <div><b>1. District:</b> {c.district || 'Kolkata'}</div>
                <div><b>2. Police Station:</b> {c.police_station}</div>
                <div><b>3. FIR Number:</b> {c.fir_number || c.case_number}</div>
                <div><b>4. Date of FIR:</b> {new Date(c.fir_date || c.created_at).toLocaleDateString()}</div>
                <div><b>5. Offense / Act:</b> IPC Section 420/379 ({c.crime_type})</div>
                <div><b>6. Occurrence of Offense:</b> {c.incident_date ? new Date(c.incident_date).toLocaleString() : 'N/A'}</div>
                <div><b>7. General Diary Reference:</b> GD-{c.id}-2026</div>
                <div><b>8. Type of Information:</b> Written / Official Deposition</div>
              </div>

              <hr />

              <div className="fir-section">
                <h4>9. Complainant / Informant:</h4>
                <p><b>Name:</b> {c.complainant_name || 'N/A'}</p>
                <p><b>Address:</b> {c.complainant_address || 'N/A'}</p>
                <p><b>Statement:</b> {c.complainant_statement || c.description}</p>
              </div>

              <div className="fir-section">
                <h4>10. Place of Occurrence:</h4>
                <p>{c.incident_location} (Coordinates: {c.latitude?.toFixed(4)}, {c.longitude?.toFixed(4)})</p>
              </div>

              <div className="fir-section">
                <h4>11. Investigating Officer Assigned:</h4>
                <p>{c.assigned_officer || c.created_by_officer} (Rank: Inspector)</p>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 3: PEOPLE --- */}
        {activeTab === 'people' && (
          <div className="tab-pane-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3>Connected Persons ({entities.filter((e) => e.type === 'PERSON').length})</h3>
              <button className="btn btn-primary" onClick={() => setShowAddPersonModal(true)}>
                <Plus size={16} /> Add Person
              </button>
            </div>

            <div className="people-grid">
              {entities.filter((e) => e.type === 'PERSON').map((p) => (
                <div key={p.id} className="card person-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b>{p.value}</b>
                    <span className={`badge badge-${p.role === 'SUSPECT' ? 'danger' : p.role === 'VICTIM' ? 'warning' : 'primary'}`}>
                      {p.role || 'PERSON'}
                    </span>
                  </div>
                  {p.metadata && (
                    <div style={{ marginTop: '10px', fontSize: '13px', color: '#64748b' }}>
                      {p.metadata.statement && <p>"{p.metadata.statement}"</p>}
                      {p.metadata.age && <span>Age: {p.metadata.age} · Gender: {p.metadata.gender}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB 4: EVIDENCE --- */}
        {activeTab === 'evidence' && (
          <div className="tab-pane-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3>Evidence Inventory & Chain of Custody</h3>
              <button className="btn btn-primary" onClick={() => setShowUploadEvidenceModal(true)}>
                <Upload size={16} /> Upload Evidence File
              </button>
            </div>

            <div className="card">
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>File Name / Title</th>
                      <th>Type</th>
                      <th>SHA-256 Hash</th>
                      <th>Status</th>
                      <th>RAG Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evidenceList.map((ev) => (
                      <tr key={ev.id}>
                        <td><b>{ev.title}</b></td>
                        <td><span className="tag tag-action">{ev.source_type}</span></td>
                        <td><code>{ev.document_hash.slice(0, 16)}...</code></td>
                        <td>
                          <span className={`badge badge-${ev.processing_status === 'READY' || ev.processing_status === 'DATASET_RECORDED' ? 'success' : 'warning'}`}>
                            {ev.processing_status}
                          </span>
                        </td>
                        <td><span className="badge badge-primary">INDEXED</span></td>
                        <td>
                          <div className="action-buttons-cell">
                            <button
                              className="btn-icon"
                              title="View Content"
                              onClick={async () => {
                                const cont = await api.documents.getContent(ev.id);
                                setViewEvidenceModal(cont);
                              }}
                            >
                              <Eye size={16} />
                            </button>
                            {ev.processing_status !== 'DATASET_RECORDED' && (
                              <a
                                href={api.documents.getDownloadUrl(ev.id)}
                                className="btn-icon"
                                title="Download"
                                download
                              >
                                <Download size={16} />
                              </a>
                            )}
                            <button
                              className="btn-icon"
                              title="Re-index RAG"
                              onClick={() => handleReindexEvidence(ev.id)}
                            >
                              <RefreshCw size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!evidenceList.length && (
                      <tr><td colSpan={6} className="text-center text-muted">No evidence records registered for this case.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 5: ENTITIES --- */}
        {activeTab === 'entities' && (
          <div className="tab-pane-content">
            <div className="card">
              <div className="card-header">
                <h3>Structured Extracted Entities</h3>
                <span className="badge badge-primary">{entities.length} Recorded</span>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Entity Type</th>
                      <th>Value / Identifier</th>
                      <th>Role in Case</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entities.map((e) => (
                      <tr key={e.id}>
                        <td><span className={`tag tag-${e.type.toLowerCase()}`}>{e.type}</span></td>
                        <td><b>{e.value}</b></td>
                        <td>{e.role}</td>
                        <td>100%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 6: INVESTIGATION GRAPH --- */}
        {activeTab === 'graph' && (
          <div className="tab-pane-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3>Investigation Entity & Relationship Graph</h3>
              <input value={graphSearch} onChange={(e) => setGraphSearch(e.target.value)} placeholder="Search entities..." aria-label="Search entities" />
              <button className="btn btn-primary" onClick={() => setShowAddRelModal(true)}>
                <Plus size={16} /> Add Relationship Link
              </button>
            </div>

            <div className="card graph-canvas-container" style={{ minHeight: '420px', padding: '24px', background: '#0f172a', color: '#fff', borderRadius: '12px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', alignItems: 'center' }}>
                {graphData.nodes.filter((node) => `${node.type} ${node.role || ''} ${node.label}`.toLowerCase().includes(graphSearch.toLowerCase())).map((node) => (
                  <div
                    key={node.id}
                    className="graph-node-box"
                    onClick={() => setSelectedGraphNode(node)}
                    role="button"
                    tabIndex={0}
                    style={{
                      background: node.type === 'PERSON' ? '#1e293b' : '#334155',
                      border: node.role === 'SUSPECT' ? '2px solid #ef4444' : node.role === 'VICTIM' ? '2px solid #f59e0b' : '2px solid #3b82f6',
                      borderRadius: '10px',
                      padding: '12px 18px',
                      textAlign: 'center',
                      minWidth: '160px'
                    }}
                  >
                    <small style={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: '10px' }}>{node.type} ({node.role})</small>
                    <div style={{ fontWeight: 'bold', marginTop: '4px' }}>{node.label}</div>
                  </div>
                ))}
              </div>

              {selectedGraphNode && (
                <div style={{ marginTop: '16px', padding: '14px', background: '#172554', border: '1px solid #3b82f6', borderRadius: '8px' }}>
                  <b>{selectedGraphNode.type}: {selectedGraphNode.label}</b>
                  <div style={{ color: '#cbd5e1', marginTop: '5px' }}>Role: {selectedGraphNode.role || 'OTHER'} · Confidence: {selectedGraphNode.confidence ?? 'N/A'}</div>
                </div>
              )}

              <div style={{ marginTop: '24px', padding: '16px', background: '#1e293b', borderRadius: '8px' }}>
                <h4>Active Relationship Connections ({graphData.edges.length})</h4>
                <div style={{ display: 'grid', gap: '8px', marginTop: '8px' }}>
                  {graphData.edges.map((edge) => (
                    <div key={edge.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                      <span style={{ color: '#60a5fa' }}>{graphNodeLabels.get(String(edge.source)) || `Entity #${edge.source}`}</span>
                      <span>——[ <b style={{ color: '#38bdf8' }}>{edge.label}</b> ]——▶</span>
                      <span style={{ color: '#60a5fa' }}>{graphNodeLabels.get(String(edge.target)) || `Entity #${edge.target}`}</span>
                    </div>
                  ))}
                  {!graphData.edges.length && (
                    <p className="text-muted">No explicit relationship edges configured yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 7: TIMELINE --- */}
        {activeTab === 'timeline' && (
          <div className="tab-pane-content">
            <h3>Chronological Investigation Feed</h3>
            <p className="text-muted" style={{ marginBottom: '20px' }}>
              Distinguishing verified investigation events from automated system ingestion logs.
            </p>

            <div className="vertical-timeline">
              {timeline.map((item) => (
                <div key={item.id} className={`timeline-entry ${item.category.toLowerCase()}`}>
                  <div className="timeline-marker">
                    {item.category === 'INVESTIGATION' ? <ShieldCheck size={14} /> : <Activity size={14} />}
                  </div>
                  <div className="timeline-card card">
                    <div className="timeline-meta">
                      <span className={`tag tag-${item.category === 'INVESTIGATION' ? 'role' : 'action'}`}>
                        {item.category}
                      </span>
                      <span className="timeline-date">
                        {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Date Pending'}
                      </span>
                    </div>
                    <h4>{item.title}</h4>
                    <p>{item.description}</p>
                    <small className="text-muted">Responsible: <b>{item.actor}</b></small>
                  </div>
                </div>
              ))}
              {!timeline.length && (
                <div className="card empty-timeline">No chronological timeline entries recorded yet.</div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 8: COORDINATION --- */}
        {activeTab === 'coordination' && (
          <div className="tab-pane-content">
            <div className="card" style={{ marginBottom: '20px', padding: '24px' }}>
              <h2>Inter-Station Police Coordination</h2>
              <p className="text-muted">Dispatch formal information requests to neighboring police precincts and track intelligence findings.</p>

              {coordSuccess && (
                <div className="alert alert-success" style={{ marginTop: '12px' }}>
                  <CheckCircle2 size={16} />
                  <span>{coordSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSendCoordination} style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label>Recipient Police Station *</label>
                  <select
                    value={coordStationName}
                    onChange={(e) => setCoordStationName(e.target.value)}
                  >
                    <option>Electronics Complex Police Station</option>
                    <option>Shakespeare Sarani Police Station</option>
                    <option>Park Street Police Station</option>
                    <option>Alipore Police Station</option>
                    <option>Bidhannagar Police Station</option>
                    <option>Lalbazar Cyber Crime Police Station</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Specific Intelligence / Action Required *</label>
                  <textarea
                    rows={3}
                    required
                    value={coordReqBody}
                    onChange={(e) => setCoordReqBody(e.target.value)}
                    placeholder="Request cross-verification of suspect vehicle, CCTV recordings, or registered resident query..."
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  <Send size={15} /> Dispatch Inter-Station Request
                </button>
              </form>
            </div>
          </div>
        )}

        {/* --- TAB 9: AI ASSISTANT (RAG) --- */}
        {activeTab === 'assistant' && (
          <div className="tab-pane-content">
            <div className="card ai-chat-container">
              <div className="ai-chat-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} className="text-primary" />
                  <h3>INVESTRA Grounded Case AI Assistant</h3>
                </div>
                <span className="badge badge-primary">Model: qwen3.5:0.8b (Local / Ollama)</span>
              </div>

              <div className="chat-messages-area">
                {chatHistory.map((msg, i) => (
                  <div key={i} className="chat-message-group">
                    <div className="user-query-bubble">
                      <b>Investigator:</b> {msg.query}
                    </div>
                    <div className="ai-answer-bubble card">
                      <div className="ai-badge">AI Grounded Intelligence</div>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{msg.answer}</p>
                      
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="sources-citation-box">
                          <small><b>Verified Sources:</b></small>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                            {msg.sources.map((s, si) => (
                              <span key={si} className="badge badge-secondary">
                                [{s.label}] {s.title} (Score: {s.score})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {!chatHistory.length && (
                  <div className="empty-chat-state">
                    <Sparkles size={32} />
                    <h4>Ask any fact about Case {c.fir_number || c.case_number}</h4>
                    <p>Examples: "What happened in this incident?", "Who is the primary suspect?", "What evidence was recorded?"</p>
                  </div>
                )}
              </div>

              <form onSubmit={handleAskAI} className="chat-input-bar">
                <input
                  type="text"
                  placeholder="Ask grounded question about this case..."
                  value={chatQuery}
                  onChange={(e) => setChatQuery(e.target.value)}
                  disabled={chatLoading}
                />
                <button type="submit" className="btn btn-primary" disabled={chatLoading}>
                  {chatLoading ? <RefreshCw size={16} className="spin" /> : <Send size={16} />}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* --- TAB 10: REPORTS --- */}
        {activeTab === 'reports' && reportData && (
          <div className="tab-pane-content">
            {reportSuccess && <div className="alert alert-success" style={{ marginBottom: '14px' }}><CheckCircle2 size={16} /> <span>{reportSuccess}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
              <button className="btn btn-outline" onClick={handleDownloadReport} disabled={reportDownloading}>
                <FileCheck size={16} /> {reportDownloading ? 'Generating Professional PDF...' : 'Generate Professional PDF'}
              </button>
            </div>

            <div className="card official-report-preview report-print-root">
              <div className="report-header">
                <h2>POLICE INVESTIGATION PROGRESS REPORT</h2>
                <small>{reportData.confidentiality_notice}</small>
              </div>

              <div className="report-meta-table">
                <div><b>Case Reference:</b> {reportData.case_number}</div>
                <div><b>FIR Number:</b> {reportData.fir_number}</div>
                <div><b>Station:</b> {reportData.station}</div>
                <div><b>Investigating Officer:</b> {reportData.investigating_officer}</div>
                <div><b>Crime Type:</b> {reportData.crime_type}</div>
                <div><b>Status:</b> {reportData.status}</div>
              </div>

              <hr />

              <div className="report-section">
                <h4>1. Incident Overview:</h4>
                <p>{reportData.incident_description}</p>
              </div>

              <div className="report-section">
                <h4>2. Suspects & Persons of Interest:</h4>
                <p>{reportData.suspects.join(', ') || 'None identified yet.'}</p>
              </div>

              <div className="report-section">
                <h4>3. Witnesses:</h4>
                <p>{reportData.witnesses.join(', ') || 'None recorded.'}</p>
              </div>

              <div className="report-section">
                <h4>4. Evidence Inventory:</h4>
                <ul>
                  {reportData.evidence_files.map((e: any) => (
                    <li key={e.id}><b>{e.name}</b> ({e.type}) — SHA-256: <code>{e.sha256}</code></li>
                  ))}
                </ul>
              </div>

              <div className="report-footer-seal">
                <div><b>Verification:</b> {reportData.verification_status}</div>
                <div><b>Generated By:</b> {reportData.generated_by}</div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 11: ACTIVITY --- */}
        {activeTab === 'activity' && (
          <div className="tab-pane-content">
            <div className="card">
              <h3>Case Audit Trail</h3>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>Actor</th>
                      <th>Details</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.audit_trail || []).map((log: any) => (
                      <tr key={log.id}>
                        <td className="text-muted">{new Date(log.created_at).toLocaleString()}</td>
                        <td><span className="tag tag-action">{log.action}</span></td>
                        <td><b>{log.actor}</b></td>
                        <td>{log.detail}</td>
                        <td><span className="badge badge-success">{log.result || 'SUCCESS'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL: View Evidence Content --- */}
      {viewEvidenceModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Evidence Content: {viewEvidenceModal.title}</h3>
              <button className="btn-icon" onClick={() => setViewEvidenceModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <p><b>SHA-256 Hash:</b> <code>{viewEvidenceModal.document_hash}</code></p>
              <pre style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {viewEvidenceModal.content_text}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: Add Person --- */}
      {showAddPersonModal && (
        <div className="modal-overlay">
          <div className="modal-card modal-sm">
            <div className="modal-header">
              <h3>Add Person to Case</h3>
              <button className="btn-icon" onClick={() => setShowAddPersonModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddPerson}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newPersonForm.name}
                    onChange={(e) => setNewPersonForm({ ...newPersonForm, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Role in Case *</label>
                  <select
                    value={newPersonForm.role}
                    onChange={(e) => setNewPersonForm({ ...newPersonForm, role: e.target.value })}
                  >
                    <option value="SUSPECT">Suspect</option>
                    <option value="WITNESS">Witness</option>
                    <option value="VICTIM">Victim</option>
                    <option value="PERSON_OF_INTEREST">Person of Interest</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Statement / Deposition Notes</label>
                  <textarea
                    rows={3}
                    value={newPersonForm.notes}
                    onChange={(e) => setNewPersonForm({ ...newPersonForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddPersonModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Person</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: Add Relationship --- */}
      {showAddRelModal && (
        <div className="modal-overlay">
          <div className="modal-card modal-sm">
            <div className="modal-header">
              <h3>Connect Relationship Link</h3>
              <button className="btn-icon" onClick={() => setShowAddRelModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddRelationship}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Source Entity</label>
                  <select
                    value={newRelForm.source_id}
                    onChange={(e) => setNewRelForm({ ...newRelForm, source_id: Number(e.target.value) })}
                  >
                    <option value={0}>Select Source</option>
                    {entities.map((ent) => (
                      <option key={ent.id} value={ent.id}>{ent.value} ({ent.type})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Relationship Type</label>
                  <select
                    value={newRelForm.type}
                    onChange={(e) => setNewRelForm({ ...newRelForm, type: e.target.value })}
                  >
                    <option value="SUSPECT_AGAINST_VICTIM">SUSPECT_AGAINST_VICTIM</option>
                    <option value="WITNESS_TO_INCIDENT">WITNESS_TO_INCIDENT</option>
                    <option value="USED_DEVICE">USED_DEVICE</option>
                    <option value="ASSOCIATED_WITH">ASSOCIATED_WITH</option>
                    <option value="LOCATED_AT">LOCATED_AT</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Target Entity</label>
                  <select
                    value={newRelForm.target_id}
                    onChange={(e) => setNewRelForm({ ...newRelForm, target_id: Number(e.target.value) })}
                  >
                    <option value={0}>Select Target</option>
                    {entities.map((ent) => (
                      <option key={ent.id} value={ent.id}>{ent.value} ({ent.type})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddRelModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Link Entities</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: Upload Evidence --- */}
      {showUploadEvidenceModal && (
        <div className="modal-overlay">
          <div className="modal-card modal-sm">
            <div className="modal-header">
              <h3>Upload Evidence File</h3>
              <button className="btn-icon" onClick={() => setShowUploadEvidenceModal(false)}>×</button>
            </div>
            <form onSubmit={handleUploadEvidence}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Select Evidence File (PDF, DOCX, TXT) *</label>
                  <input
                    type="file"
                    required
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => setEvidenceFile(e.target.files ? e.target.files[0] : null)}
                  />
                  <small>Calculates SHA-256 hash and runs text extraction & vector indexing.</small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowUploadEvidenceModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Upload & Process</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
