import { useEffect, useState, type ReactNode } from 'react';
import {
  Activity,
  ArrowRight,
  Bell,
  Check,
  CircleAlert,
  CircleCheck,
  ClipboardCheck,
  FileText,
  Home,
  MapPin,
  Menu,
  Network,
  Plus,
  Radio,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
  Map,
  Shield,
  Edit3,
  LogOut,
  FilePlus
} from 'lucide-react';
import './App.css';
import RealMap, { type CrimeLocation, type StationLocation } from './components/RealMap';
import AdminPortal from './components/AdminPortal';
import NewCaseIntake from './components/NewCaseIntake';
import CaseUpdateModal from './components/CaseUpdateModal';
import LoginModal from './components/LoginModal';

type View = 'overview' | 'stations' | 'requests' | 'report' | 'map' | 'new_case' | 'admin' | 'network' | 'audit';

interface Recommendation {
  id: number;
  name: string;
  area: string;
  score: number;
  level: string;
  reasons: string[];
  selected: boolean;
  latitude?: number;
  longitude?: number;
  distance_km?: number;
}

interface RequestItem {
  id: number;
  code: string;
  station: string;
  status: string;
  body: string;
  approved_by?: string;
  created_at: string;
  response?: {
    result: string;
    summary: string;
    source_reference: string;
    verification_status: string;
  } | null;
}

interface CaseFileItem {
  id: number;
  title: string;
  document_hash: string;
  source_type: string;
  uploaded_at?: string;
}

interface Workspace {
  case: {
    id: number;
    number: string;
    title: string;
    description: string;
    status: string;
    crime_type?: string;
    incident_location?: string;
    latitude: number;
    longitude: number;
    created_by_officer?: string;
  };
  entities: { id: number; type: string; value: string; confidence: number }[];
  evidence?: CaseFileItem[];
  recommendations: Recommendation[];
  requests: RequestItem[];
  activity: { action: string; detail: string; actor?: string; at: string }[];
}

interface CaseListItem {
  id: number;
  case_number: string;
  title: string;
  crime_type?: string;
  incident_location?: string;
  latitude?: number;
  longitude?: number;
  status: string;
}

interface ReportData {
  case_number: string;
  title: string;
  crime_type?: string;
  incident_location?: string;
  generated_at: string;
  stations: { station: string; status: string }[];
  findings: { text: string; source: string }[];
  sources: { reference: string; station: string }[];
  pending: number;
  conflicts?: string[];
  verification_note: string;
}

const API = import.meta.env.VITE_API_URL || '/api';

async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('investra_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'The requested action could not be completed.');
  }
  return response.json() as Promise<T>;
}

export default function App() {
  const [view, setView] = useState<View>('overview');
  const [menu, setMenu] = useState(false);
  const [data, setData] = useState<Workspace | null>(null);
  const [allCases, setAllCases] = useState<CaseListItem[]>([]);
  const [report, setReport] = useState<ReportData | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: number; username: string; badge_number: string; full_name: string;
    rank: string; station_name: string; role: string;
  } | null>(() => {
    const saved = localStorage.getItem('investra_user');
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });

  const tell = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3800);
  };

  const loadCasesList = async () => {
    try {
      const list = await api<CaseListItem[]>('/cases/');
      setAllCases(list);
    } catch {
      // Fallback
    }
  };

  const load = async (caseId?: number) => {
    try {
      setError('');
      let activeCaseId = caseId;
      if (!activeCaseId) {
        const boot = await api<{ case_id: number }>('/coordination/bootstrap', 'POST');
        activeCaseId = boot.case_id;
      }
      const ws = await api<Workspace>(`/coordination/cases/${activeCaseId}/workspace`);
      setData(ws);
      void loadCasesList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect to the INVESTRA PostgreSQL API.');
    }
  };

  useEffect(() => {
    if (currentUser) void load();
  }, [currentUser]);

  const action = async (work: () => Promise<unknown>, message: string, next?: View) => {
    try {
      await work();
      if (data) await load(data.case.id);
      if (next) setView(next);
      tell(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    }
  };

  const openReport = async () => {
    if (!data) return;
    try {
      setReport(await api<ReportData>(`/coordination/cases/${data.case.id}/report`));
      setView('report');
      await load(data.case.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate report.');
    }
  };

  const addEvidence = () => {
    const text = window.prompt(
      'Enter case notes, witness statements, or identifiers (Vehicle, Phone, Suspect). INVESTRA AI will extract entities into PostgreSQL:'
    );
    if (text?.trim() && data && currentUser) {
      void action(
        () => api(`/coordination/cases/${data.case.id}/evidence`, 'POST', { text, officer_badge: currentUser.badge_number }),
        'Evidence processed and entities updated in PostgreSQL.'
      );
    }
  };

  const handleCaseSelected = (newCaseId: number) => {
    void load(newCaseId);
    tell(`Switched to active case in PostgreSQL.`);
  };

  if (!currentUser) {
    return (
      <LoginModal
        apiBase={API}
        onLoginSuccess={(user) => setCurrentUser(user)}
        onClose={() => undefined}
      />
    );
  }

  if (!data && !error) {
    return (
      <div className="loading">
        <ShieldCheck size={32} /> Loading INVESTRA secure police intelligence workspace…
      </div>
    );
  }

  const current = data || {
    case: {
      id: 1,
      number: 'FIR-2026-104',
      title: 'Harbor Road incident',
      description: '',
      status: 'OPEN',
      latitude: 22.5804,
      longitude: 88.4282,
      incident_location: 'Sector V, Salt Lake, Kolkata'
    },
    entities: [],
    evidence: [],
    recommendations: [],
    requests: [],
    activity: []
  };

  // Convert case and station data for real map
  const activeCrimeLocation: CrimeLocation = {
    lat: current.case.latitude || 22.5804,
    lng: current.case.longitude || 88.4282,
    label: current.case.incident_location || current.case.title,
    caseNumber: current.case.number,
    crimeType: current.case.crime_type
  };

  const allCrimeLocations: CrimeLocation[] = allCases.map((c) => ({
    lat: c.latitude || 22.5804,
    lng: c.longitude || 88.4282,
    label: c.incident_location || c.title,
    caseNumber: c.case_number,
    crimeType: c.crime_type
  }));

  const mapStations: StationLocation[] = current.recommendations.map((r) => ({
    id: r.id,
    name: r.name,
    area: r.area,
    score: r.score,
    level: r.level,
    latitude: r.latitude,
    longitude: r.longitude,
    distance_km: r.distance_km,
    selected: r.selected
  }));

  return (
    <div className="app-shell">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${menu ? 'sidebar-open' : ''}`}>
        <div className="brand-wrap">
          <div className="brand-mark">
            <ShieldCheck size={20} />
          </div>
          <div>
            <strong>INVESTRA</strong>
            <span>Police Investigation Intelligence</span>
          </div>
          <button className="mobile-close" onClick={() => setMenu(false)}>
            <X size={19} />
          </button>
        </div>

        {/* Active Case Selector from PostgreSQL */}
        <div className="case-selector">
          <span>ACTIVE POLICE CASE (POSTGRESQL)</span>
          <select
            value={current.case.id}
            onChange={(e) => handleCaseSelected(Number(e.target.value))}
            className="w-full mt-1.5 bg-slate-900 border border-slate-700 text-white rounded p-1.5 text-xs font-bold focus:outline-none"
          >
            {allCases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.case_number} · {c.title.slice(0, 24)}...
              </option>
            ))}
          </select>
        </div>

        {/* Primary Navigation */}
        <nav aria-label="Primary navigation">
          <Nav
            active={view === 'overview'}
            icon={<Home size={18} />}
            label="Case overview"
            onClick={() => setView('overview')}
          />
          <Nav
            active={view === 'map'}
            icon={<Map size={18} />}
            label="Crime scene map"
            badge="Real Map"
            onClick={() => setView('map')}
          />
          <Nav
            active={view === 'new_case'}
            icon={<FilePlus size={18} />}
            label="Upload new case"
            badge="Intake"
            onClick={() => setView('new_case')}
          />
          <Nav
            active={view === 'stations'}
            icon={<MapPin size={18} />}
            label="Station selection"
            badge={String(current.recommendations.length)}
            onClick={() => setView('stations')}
          />
          <Nav
            active={view === 'requests'}
            icon={<Send size={18} />}
            label="Information requests"
            badge={String(current.requests.length)}
            onClick={() => setView('requests')}
          />
          <Nav
            active={view === 'report'}
            icon={<FileText size={18} />}
            label="Consolidated report"
            onClick={() => void openReport()}
          />
          <Nav
            active={view === 'network'}
            icon={<Network size={18} />}
            label="Entity network"
            onClick={() => setView('network')}
          />
        </nav>

        {/* Sidebar Footer: Admin Portal Link & Police Officer Profile */}
        <div className="sidebar-bottom">
          <button
            className={`nav-item ${view === 'admin' ? 'active' : ''} text-amber-300 hover:text-amber-200 mb-2`}
            onClick={() => setView('admin')}
          >
            <Shield size={17} className="text-amber-400" />
            <span className="font-semibold">Admin portal (URL-Protected)</span>
          </button>

          <button className="audit-link" onClick={() => setView('audit')}>
            <Activity size={16} /> Audit trail &amp; logs
          </button>

          {/* Officer Session Card */}
          <div className="user-card mt-2 border-t border-slate-800 pt-3">
            <div className="avatar">
              {currentUser.full_name ? currentUser.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'PO'}
            </div>
            <div className="truncate">
              <strong className="block truncate text-white">{currentUser.full_name || 'Police Officer'}</strong>
              <span className="block truncate text-[10px] text-slate-400">
                {currentUser.badge_number || 'Badge'} · {currentUser.rank || 'Officer'}
              </span>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('investra_token');
                localStorage.removeItem('investra_user');
                setData(null);
                setCurrentUser(null);
              }}
              className="ml-auto text-slate-400 hover:text-white p-1"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {menu && <button className="backdrop" aria-label="Close navigation" onClick={() => setMenu(false)} />}

      {/* Main Content Area */}
      <main className="main-content">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMenu(true)}>
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            Cases <span>/</span> {current.case.number} <span>/</span> <strong>{labelFor(view)}</strong>
          </div>
          <div className="header-actions">
            <button className="icon-button" onClick={() => tell('All AI coordination agents active and verified.')}>
              <Bell size={19} />
              <i />
            </button>
            <button className="secondary-button" onClick={() => setShowUpdateModal(true)}>
              <Edit3 size={15} /> Update case
            </button>
            <button className="new-case" onClick={() => setView('new_case')}>
              <Plus size={16} /> Upload new case
            </button>
          </div>
        </header>

        <section className="workspace">
          {error && (
            <div className="error-banner">
              <CircleAlert size={18} />
              <span>{error}</span>
              <button onClick={() => void load(current.case.id)}>Retry</button>
            </div>
          )}

          {/* View 1: Case Overview */}
          {view === 'overview' && (
            <Overview
              data={current}
              onEvidence={addEvidence}
              onStations={() => setView('stations')}
              onReport={() => void openReport()}
              onAudit={() => setView('audit')}
              onOpenMap={() => setView('map')}
              onUpdateCase={() => setShowUpdateModal(true)}
              crimeLocation={activeCrimeLocation}
              stations={mapStations}
            />
          )}

          {/* View 2: Crime Scene Map (REAL MAP NOT A BLANK SHEET!) */}
          {view === 'map' && (
            <CrimeSceneMapView
              currentCase={current.case}
              crimeLocation={activeCrimeLocation}
              allCrimeLocations={allCrimeLocations}
              stations={mapStations}
              onNewCase={() => setView('new_case')}
            />
          )}

          {/* View 3: Dedicated Case Upload Page */}
          {view === 'new_case' && (
            <NewCaseIntake
              apiBase={API}
              onCaseCreated={(newId) => {
                void load(newId);
                setView('overview');
              }}
              onNotice={tell}
            />
          )}

          {/* View 4: Admin Portal Protected by URL Encoding */}
          {view === 'admin' && <AdminPortal apiBase={API} onNotice={tell} />}

          {/* View 5: Station Recommendations */}
          {view === 'stations' && (
            <Stations
              data={current}
              onToggle={(item) =>
                void action(
                  () => api(`/coordination/recommendations/${item.id}`, 'PATCH', { selected: !item.selected }),
                  `${item.name} coordination selection updated.`
                )
              }
              onDrafts={() =>
                void action(
                  () =>
                    api(`/coordination/cases/${current.case.id}/requests/drafts`, 'POST', {
                      station_ids: current.recommendations.filter((item) => item.selected).map((item) => item.id)
                    }),
                  'Request drafts prepared for investigator approval.',
                  'requests'
                )
              }
              onViewMap={() => setView('map')}
            />
          )}

          {/* View 6: Information Requests */}
          {view === 'requests' && (
            <Requests
              data={current}
              onApprove={(request) =>
                void action(
                  () => api(`/coordination/requests/${request.id}/approve`, 'POST'),
                  `${request.code} approved and logged as sent to ${request.station}.`
                )
              }
              onResponse={(request) => {
                const text = window.prompt(
                  `Enter official response received from ${request.station}:`
                );
                if (text?.trim()) {
                  void action(
                    () => api(`/coordination/requests/${request.id}/responses`, 'POST', { text }),
                    'Station response ingested and normalized into common structure.'
                  );
                }
              }}
            />
          )}

          {/* View 7: Consolidated Investigation Report */}
          {view === 'report' && (
            <Report
              report={report}
              onRefresh={openReport}
              onVerify={() => {
                if (data) {
                  void action(
                    () => api(`/coordination/cases/${data.case.id}/report/verify`, 'POST'),
                    'Report verified and stamped by investigating officer.'
                  );
                }
              }}
            />
          )}

          {/* View 8: Entity Network */}
          {view === 'network' && <NetworkView data={current} />}

          {/* View 9: Case Audit Trail */}
          {view === 'audit' && <Audit data={current} />}
        </section>
      </main>

      {/* Case Update Modal */}
      {showUpdateModal && data && (
        <CaseUpdateModal
          apiBase={API}
          caseData={data.case}
          onClose={() => setShowUpdateModal(false)}
          onUpdated={() => void load(data.case.id)}
          onNotice={tell}
        />
      )}

      {/* Police Officer Login Modal */}
      {showLoginModal && (
        <LoginModal
          apiBase={API}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            tell(`Logged in as ${user.full_name} (${user.badge_number}).`);
          }}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      {notice && (
        <div className="toast">
          <CircleCheck size={18} />
          {notice}
        </div>
      )}
    </div>
  );
}

function Nav({
  active,
  icon,
  label,
  badge,
  onClick
}: {
  active?: boolean;
  icon: ReactNode;
  label: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
      {badge && <em>{badge}</em>}
    </button>
  );
}

function Overview({
  data,
  onEvidence,
  onStations,
  onReport,
  onAudit,
  onOpenMap,
  onUpdateCase,
  crimeLocation,
  stations
}: {
  data: Workspace;
  onEvidence: () => void;
  onStations: () => void;
  onReport: () => void;
  onAudit: () => void;
  onOpenMap: () => void;
  onUpdateCase: () => void;
  crimeLocation: CrimeLocation;
  stations: StationLocation[];
}) {
  const received = data.requests.filter((item) => item.status === 'RESPONDED').length;

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            <Radio size={13} /> Active Police Investigation · PostgreSQL
          </p>
          <h1>{data.case.title}</h1>
          <p>
            {data.case.number} · Location: {data.case.incident_location} · Status: <span className="status-chip draft">{data.case.status}</span>
          </p>
        </div>
        <div className="heading-actions">
          <button className="secondary-button" onClick={onStations}>
            <Sparkles size={15} /> Station AI
          </button>
          <button className="secondary-button" onClick={onUpdateCase}>
            <Edit3 size={15} /> Edit Case
          </button>
          <button className="secondary-button" onClick={onEvidence}>
            <Upload size={15} /> Add Note
          </button>
          <button className="primary-button" onClick={onOpenMap}>
            <Map size={15} /> Crime Scene Map
          </button>
        </div>
      </div>

      {/* Human Safeguard Banner */}
      <div className="human-control">
        <ShieldCheck size={22} className="shrink-0 text-blue-600" />
        <div>
          <strong>Safety &amp; Accountability Safeguard</strong>
          <span>
            INVESTRA AI provides coordination recommendations and normalized responses based on authorized police records.
            Human verification by an authorized investigating officer is mandatory before sending requests or acting on findings.
          </span>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="metric-grid">
        <Metric
          icon={<MapPin />}
          label="Stations recommended"
          value={String(data.recommendations.length)}
          note={`${data.recommendations.filter((x) => x.level === 'HIGH').length} high-priority within grid`}
          tone="blue"
        />
        <Metric
          icon={<Send />}
          label="Requests in progress"
          value={String(data.requests.length)}
          note={`${data.requests.filter((x) => x.status === 'SENT').length} awaiting response`}
          tone="violet"
        />
        <Metric
          icon={<ClipboardCheck />}
          label="Responses processed"
          value={`${received} / ${data.requests.length}`}
          note="Normalized with source hashes"
          tone="green"
        />
        <Metric
          icon={<CircleAlert />}
          label="Items to verify"
          value={String(received)}
          note="Original records verification"
          tone="amber"
        />
      </div>

      {/* Mini Real Map Section */}
      <section className="panel mb-6 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Map size={17} className="text-red-500" />
            <h3 className="text-sm font-bold text-slate-800">
              Crime Scene &amp; Police Precincts (Google Maps)
            </h3>
          </div>
          <button className="text-button flex items-center space-x-1" onClick={onOpenMap}>
            <span>Expand Full Map</span>
            <ArrowRight size={13} />
          </button>
        </div>
        <div className="h-[280px] rounded-lg overflow-hidden border border-slate-200">
          <RealMap crimeLocation={crimeLocation} stations={stations} height="280px" />
        </div>
      </section>

      {/* Content Grid */}
      <div className="content-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">INVESTIGATION RECORD</p>
              <h2>Case Brief &amp; Extracted Identifiers</h2>
            </div>
            <button className="text-button" onClick={onEvidence}>
              Add note
            </button>
          </div>
          <p className="case-description">{data.case.description || 'No case brief recorded yet.'}</p>
          <div className="entity-list">
            {data.entities.slice(0, 6).map((entity) => (
              <Entity key={entity.id} type={entity.type} value={entity.value} />
            ))}
          </div>
          <div className="panel-footer">
            <span>
              <Check size={15} /> Source hash retained
            </span>
            <span>
              <Check size={15} /> {data.entities.length} entities indexed
            </span>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">CHAIN OF CUSTODY TIMELINE</p>
              <h2>Recent Investigation Activity</h2>
            </div>
            <button className="text-button" onClick={onAudit}>
              View all
            </button>
          </div>
          <div className="timeline">
            {data.activity.slice(0, 4).map((item, index) => (
              <Time
                key={`${item.action}-${index}`}
                tone={index === 0 ? 'green' : index === 1 ? 'blue' : 'purple'}
                title={pretty(item.action)}
                text={item.detail}
                time={formatDate(item.at)}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Source-Backed Intelligence Section */}
      <section className="panel findings-panel">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">SOURCE-BACKED INTELLIGENCE</p>
            <h2>Verified Findings from Participating Stations</h2>
          </div>
          <button className="primary-button small" onClick={onReport}>
            Consolidate Report <ArrowRight size={15} />
          </button>
        </div>
        {data.requests.filter((item) => item.response).length > 0 ? (
          data.requests
            .filter((item) => item.response)
            .slice(0, 3)
            .map((item) => (
              <Finding
                key={item.id}
                icon={<Search size={18} />}
                title={item.response?.result === 'MATCH_FOUND' ? 'Relevant Record Identified' : 'No Matching Record Reported'}
                text={item.response?.summary || ''}
                source={`Source: ${item.response?.source_reference} · ${item.station}`}
              />
            ))
        ) : (
          <div className="empty-row">
            No station responses have been ingested yet. Send request drafts from the Station Selection tab to begin coordination.
          </div>
        )}
      </section>
    </>
  );
}

function CrimeSceneMapView({
  currentCase,
  crimeLocation,
  allCrimeLocations,
  stations,
  onNewCase
}: {
  currentCase: Workspace['case'];
  crimeLocation: CrimeLocation;
  allCrimeLocations: CrimeLocation[];
  stations: StationLocation[];
  onNewCase: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            <Map size={13} /> Spatial Intelligence Engine
          </p>
          <h1>Crime Scene Location &amp; Police Station Proximity</h1>
          <p>
            Google Maps displays the active police case. Linked station cards open each recommended precinct in Google Maps.
          </p>
        </div>
        <div className="heading-actions">
          <button className="primary-button" onClick={onNewCase}>
            <Plus size={15} /> Add New Crime Scene
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map Column (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="h-[600px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
            <RealMap
              crimeLocation={crimeLocation}
              allCrimeLocations={allCrimeLocations}
              stations={stations}
              height="600px"
              showProximityLines={true}
            />
          </div>
        </div>

        {/* Stations Proximity Sidebar (1 col) */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Active Crime Scene</h3>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs space-y-1">
              <strong className="text-red-700 block text-sm">{currentCase.number}</strong>
              <p className="text-slate-600">{currentCase.title}</p>
              <p className="text-slate-500 font-medium">📍 {currentCase.incident_location}</p>
              <p className="text-slate-400 font-mono text-[11px]">
                {currentCase.latitude.toFixed(4)}, {currentCase.longitude.toFixed(4)}
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Proximity to Precincts</h3>
            <div className="space-y-2 text-xs">
              {stations.map((st) => (
                <div key={st.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div>
                    <strong className="block text-slate-800">{st.name}</strong>
                    <span className="text-slate-500 text-[11px]">{st.area}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-blue-600 block">
                      {st.distance_km ? `${st.distance_km} km` : 'Proximity'}
                    </span>
                    <span className={`text-[10px] font-bold ${st.level === 'HIGH' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {st.score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stations({
  data,
  onToggle,
  onDrafts,
  onViewMap
}: {
  data: Workspace;
  onToggle: (item: Recommendation) => void;
  onDrafts: () => void;
  onViewMap: () => void;
}) {
  const selected = data.recommendations.filter((item) => item.selected);

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            <Sparkles size={13} /> Agent 2 · Police Station Selection Agent
          </p>
          <h1>Relevant Police Stations &amp; Explainable Ranking</h1>
          <p>
            Ranked using authorized entity matches, real crime scene spatial proximity (km), and historical precinct records.
          </p>
        </div>
        <div className="heading-actions">
          <button className="secondary-button" onClick={onViewMap}>
            <Map size={15} /> View on Real Map
          </button>
          <div className="analysis-pill">
            <Activity size={15} /> Explainable Ranking Active
          </div>
        </div>
      </div>

      <div className="explain-card">
        <ShieldCheck size={21} className="shrink-0 text-blue-600" />
        <div>
          <strong>Explainable Police Station Recommendations</strong>
          <p>
            These recommendations are coordination suggestions based on spatial distance and authorized entity overlap.
            Select only the stations you authorize for communication.
          </p>
        </div>
      </div>

      <div className="station-list">
        {data.recommendations.map((station, index) => (
          <article className={`station-card ${station.selected ? 'selected' : ''}`} key={station.id}>
            <button
              className={`check-control ${station.selected ? 'checked' : ''}`}
              onClick={() => onToggle(station)}
              aria-label={`Select ${station.name}`}
            >
              {station.selected && <Check size={15} />}
            </button>
            <div className="station-rank">{index + 1}</div>
            <div className="station-main">
              <div className="station-title">
                <div>
                  <h2>{station.name}</h2>
                  <p>
                    <MapPin size={14} />
                    {station.area}
                    {station.distance_km && <span className="ml-2 font-semibold text-blue-600">({station.distance_km} km away)</span>}
                  </p>
                </div>
                <Priority level={station.level} />
              </div>
              <div className="reason-list">
                {station.reasons.map((reason) => (
                  <span key={reason}>
                    <Check size={14} />
                    {reason}
                  </span>
                ))}
              </div>
            </div>
            <div className="confidence">
              <strong>{station.score}%</strong>
              <span>confidence</span>
              <div>
                <i style={{ width: `${station.score}%` }} />
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="approval-bar">
        <div>
          <strong>
            {selected.length} station{selected.length !== 1 ? 's' : ''} selected for communication
          </strong>
          <span>Requests remain drafts until an authorized investigator formally approves and sends each one.</span>
        </div>
        <button className="primary-button" disabled={!selected.length} onClick={onDrafts}>
          Prepare Request Drafts <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}

function Requests({
  data,
  onApprove,
  onResponse
}: {
  data: Workspace;
  onApprove: (item: RequestItem) => void;
  onResponse: (item: RequestItem) => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            <Send size={13} /> Controlled Communication Agent
          </p>
          <h1>Official Information Requests</h1>
          <p>
            Human-approved requests logged in PostgreSQL. Formal communications require investigating officer authorization.
          </p>
        </div>
      </div>

      {data.requests.length === 0 ? (
        <section className="panel empty-state">
          <Send size={28} />
          <h2>No Request Drafts Prepared</h2>
          <p>Select relevant stations from the Station Selection tab, then prepare drafts for review.</p>
        </section>
      ) : (
        <section className="panel request-table">
          <div className="table-head">
            <span>REQUEST ID</span>
            <span>POLICE STATION</span>
            <span>STATUS</span>
            <span>ACTIVITY</span>
            <span>ACTIONS</span>
          </div>
          {data.requests.map((request) => (
            <div className="table-row" key={request.id}>
              <strong>{request.code}</strong>
              <span>{request.station}</span>
              <span
                className={`status-chip ${
                  request.status === 'RESPONDED'
                    ? 'received'
                    : request.status === 'DRAFT'
                    ? 'draft'
                    : 'pending'
                }`}
              >
                {request.status === 'RESPONDED' ? <CircleCheck size={14} /> : <Activity size={14} />}{' '}
                {pretty(request.status)}
              </span>
              <span className="muted">{formatDate(request.created_at)}</span>
              <div>
                {request.status === 'DRAFT' ? (
                  <button className="text-button font-bold text-blue-600" onClick={() => onApprove(request)}>
                    Approve &amp; Log Sent
                  </button>
                ) : request.status === 'SENT' ? (
                  <button className="text-button font-bold text-emerald-600" onClick={() => onResponse(request)}>
                    Ingest Response
                  </button>
                ) : (
                  <button
                    className="text-button text-slate-600"
                    onClick={() =>
                      window.alert(
                        `Response Summary:\n${request.response?.summary || ''}\n\nSource Reference: ${
                          request.response?.source_reference || ''
                        }`
                      )
                    }
                  >
                    View Response
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="panel draft-panel">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">COMMUNICATION SAFEGUARDS</p>
            <h2>Multi-Stage Verification Workflow</h2>
          </div>
        </div>
        <div className="workflow">
          <span>
            <Check size={16} /> Draft Generated by Agent 3
          </span>
          <span>
            <ShieldCheck size={16} /> Investigator Approval
          </span>
          <span>
            <Send size={16} /> Official Communication Logged
          </span>
          <span>
            <ClipboardCheck size={16} /> Response Normalized by Agent 4
          </span>
        </div>
      </section>
    </>
  );
}

function Report({
  report,
  onRefresh,
  onVerify
}: {
  report: ReportData | null;
  onRefresh: () => void;
  onVerify: () => void;
}) {
  if (!report) {
    return (
      <section className="panel empty-state">
        <FileText size={30} />
        <h2>Investigation Report Ready to Consolidate</h2>
        <p>Consolidate all ingested police station responses into an evidence-referenced report.</p>
        <button className="primary-button" onClick={onRefresh}>
          Generate Consolidated Report
        </button>
      </section>
    );
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            <FileText size={13} /> Agent 6 · Consolidation &amp; Report Agent
          </p>
          <h1>Investigation Information Coordination Report</h1>
          <p>
            Case: {report.case_number} · Crime Scene: {report.incident_location} · Generated: {formatDate(report.generated_at)}
          </p>
        </div>
        <div className="heading-actions">
          <button className="secondary-button" onClick={() => window.print()}>
            <FileText size={16} /> Print / Export PDF
          </button>
          <button className="primary-button" onClick={onVerify}>
            <ShieldCheck size={16} /> Mark Verified
          </button>
        </div>
      </div>

      <div className="report-layout">
        <article className="report-paper">
          <div className="report-top">
            <div className="report-seal">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p>INVESTRA · POLICE INVESTIGATION INTELLIGENCE REPORT</p>
              <h2>{report.title}</h2>
            </div>
            <span className="status-chip pending">Verification Pending</span>
          </div>

          <ReportSection title="Executive Summary">
            <p>
              This investigation report presents information returned by participating police stations regarding Case {report.case_number}.
              All statements are linked to their source records. The system does not determine guilt or issue judicial verdicts.
            </p>
          </ReportSection>

          <ReportSection title="Participating Police Stations Contacted">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Station Name</th>
                  <th>Response Outcome</th>
                </tr>
              </thead>
              <tbody>
                {report.stations.map((row) => (
                  <tr key={row.station}>
                    <td><strong>{row.station}</strong></td>
                    <td>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ReportSection>

          <ReportSection title="Key Source-Backed Findings">
            {report.findings.length ? (
              <ol>
                {report.findings.map((item) => (
                  <li key={item.source}>
                    {item.text} <a href={`#${item.source}`}>[{item.source}]</a>
                  </li>
                ))}
              </ol>
            ) : (
              <p>No positive record matches reported yet.</p>
            )}
          </ReportSection>

          {report.conflicts && report.conflicts.length > 0 && (
            <ReportSection title="Cross-Precinct Analysis &amp; Conflict Checks">
              <div className="verify-callout">
                <CircleAlert size={18} className="shrink-0 text-amber-600" />
                <div>
                  {report.conflicts.map((c, i) => (
                    <p key={i} className="font-semibold text-amber-900">{c}</p>
                  ))}
                </div>
              </div>
            </ReportSection>
          )}

          <ReportSection title="Items Requiring Investigating Officer Verification">
            <div className="verify-callout">
              <CircleAlert size={18} className="shrink-0 text-amber-600" />
              <span>{report.verification_note}</span>
            </div>
          </ReportSection>
        </article>

        <aside className="report-aside">
          <section className="panel">
            <p className="panel-kicker">COORDINATION PROGRESS</p>
            <h2>
              {report.stations.length - report.pending} of {report.stations.length} Precincts Responded
            </h2>
            <div className="source-progress">
              <i
                style={{
                  width: report.stations.length
                    ? `${((report.stations.length - report.pending) / report.stations.length) * 100}%`
                    : '0%'
                }}
              />
            </div>
            <p className="muted">Refresh after newly ingested responses.</p>
            <button className="text-button mt-2" onClick={onRefresh}>
              Refresh Report
            </button>
          </section>

          <section className="panel">
            <p className="panel-kicker">SOURCE EVIDENCE REGISTER</p>
            {report.sources.map((source) => (
              <a className="source-link" id={source.reference} key={source.reference} href={`#${source.reference}`}>
                {source.reference}
                <span>{source.station}</span>
              </a>
            ))}
          </section>
        </aside>
      </div>
    </>
  );
}

function NetworkView({ data }: { data: Workspace }) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            <Network size={13} /> Entity Relationship Map
          </p>
          <h1>Case Entity Network</h1>
          <p>Visible entities extracted from authorized documents and linked to coordination targets.</p>
        </div>
      </div>
      <section className="panel network-panel">
        <div className="network-center">
          {data.entities.slice(0, 8).map((entity, index) => (
            <div className={`network-node node-${index % 4}`} key={entity.id}>
              <span>{entity.type}</span>
              <strong>{entity.value}</strong>
            </div>
          ))}
          <div className="case-node">{data.case.number}</div>
        </div>
        <div className="network-legend">
          <span>Entity information is source-linked with SHA-256 integrity hashes in PostgreSQL.</span>
        </div>
      </section>
    </>
  );
}

function Audit({ data }: { data: Workspace }) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            <Activity size={13} /> Accountability &amp; Chain of Custody
          </p>
          <h1>Case Audit Trail (PostgreSQL)</h1>
          <p>Every administrative action and investigation state transition is logged immutably.</p>
        </div>
      </div>
      <section className="panel audit-panel">
        {data.activity.map((item, index) => (
          <div className="audit-row" key={`${item.action}-${index}`}>
            <div className="audit-icon">
              <Activity size={16} />
            </div>
            <div>
              <strong>{pretty(item.action)}</strong>
              <p>{item.detail}</p>
              <span>{item.actor || 'Authorized Officer'} · {formatDate(item.at)}</span>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

function Metric({
  icon,
  label,
  value,
  note,
  tone
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{note}</span>
      </div>
    </div>
  );
}

function Entity({ type, value }: { type: string; value: string }) {
  return (
    <div className="entity">
      <span>{type}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Time({ tone, title, text, time }: { tone: string; title: string; text: string; time: string }) {
  return (
    <div className="timeline-item">
      <i className={tone} />
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
      <time>{time}</time>
    </div>
  );
}

function Finding({ icon, title, text, source }: { icon: ReactNode; title: string; text: string; source: string }) {
  return (
    <div className="finding-row">
      <div className="finding-icon">{icon}</div>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
        <a href="#report">{source}</a>
      </div>
      <span className="status-chip pending">Verify</span>
    </div>
  );
}

function Priority({ level }: { level: string }) {
  return <span className={`priority ${level.toLowerCase()}`}>{level}</span>;
}

function ReportSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="report-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function pretty(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Just now';
}

function labelFor(view: View) {
  return ({
    overview: 'Case overview',
    stations: 'Station recommendations',
    requests: 'Information requests',
    report: 'Consolidated report',
    map: 'Crime scene map',
    new_case: 'Upload new case',
    admin: 'Administrator portal',
    network: 'Entity network',
    audit: 'Audit trail'
  })[view];
}
