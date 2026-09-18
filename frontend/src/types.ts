export interface User {
  id: number;
  username: string;
  email: string;
  badge_number?: string;
  full_name?: string;
  rank?: string;
  station_name?: string;
  station_id?: number;
  phone?: string;
  role: 'Administrator' | 'Police Officer' | 'Investigator' | 'Analyst';
  is_active: boolean;
  created_at?: string;
}

export interface PoliceStation {
  id: number;
  name: string;
  code: string;
  district: string;
  state: string;
  address: string;
  latitude: number;
  longitude: number;
  contact?: string;
  status: 'ACTIVE' | 'INACTIVE';
  jurisdiction?: string;
  officers_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Case {
  id: number;
  case_number: string;
  fir_number?: string;
  fir_date?: string;
  title: string;
  crime_code?: string;
  crime_type?: string;
  source_dataset?: string;
  description?: string;
  incident_date?: string;
  incident_time?: string;
  incident_location?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  status: 'DRAFT' | 'REGISTERED' | 'OPEN' | 'UNDER_INVESTIGATION' | 'ON_HOLD' | 'SUBMITTED_FOR_REVIEW' | 'CLOSED';
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  police_station?: string;
  police_station_id?: number;
  complainant_name?: string;
  complainant_contact?: string;
  complainant_address?: string;
  complainant_statement?: string;
  additional_notes?: string;
  assigned_officer_id?: number;
  assigned_officer?: string;
  created_by_officer?: string;
  created_at: string;
  updated_at?: string;
}

export interface EntityItem {
  id: number;
  entity_type: string;
  value: string;
  role?: string;
  metadata?: Record<string, any>;
  confidence_score?: number;
}

export interface EvidenceItem {
  id: number;
  title: string;
  original_filename?: string;
  document_hash: string;
  source_type: string;
  file_size?: number;
  processing_status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
  rag_status?: 'PENDING' | 'INDEXED';
  chunks_count?: number;
  uploaded_at: string;
  uploaded_by?: string;
}

export interface StationRecommendation {
  id: number;
  station_name: string;
  area: string;
  score: number;
  priority: string;
  distance_km?: number;
  reasons: string[];
  selected: boolean;
}

export interface CoordinationRequest {
  id: number;
  request_code: string;
  station_name: string;
  status: string;
  body: string;
  created_at: string;
}

export interface AuditLogItem {
  id: number;
  timestamp?: string;
  user?: string;
  actor?: string;
  user_id?: number;
  actor_user_id?: number;
  role?: string;
  action: string;
  resource?: string;
  case_id?: number;
  detail: string;
  ip_address?: string;
  result?: string;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  category: 'INVESTIGATION' | 'SYSTEM';
  type: string;
  title: string;
  description: string;
  actor: string;
}

export interface GraphData {
  nodes: {
    id: string;
    label: string;
    type: string;
    role?: string;
    confidence?: number;
    metadata?: Record<string, any>;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    label: string;
    confidence?: number;
    verification?: string;
  }[];
}

export interface AdminStats {
  total_police_officers: number;
  active_officers: number;
  inactive_officers: number;
  total_stations: number;
  active_stations: number;
  total_cases: number;
  open_cases: number;
  closed_cases: number;
  pending_coordination_requests: number;
  recent_system_activity: {
    id: number;
    timestamp: string;
    action: string;
    actor: string;
    detail: string;
    case_id?: number;
    result: string;
  }[];
}

export interface PoliceDashboardStats {
  my_assigned_cases: number;
  open_cases: number;
  cases_under_investigation: number;
  pending_requests: number;
  recent_evidence_count: number;
  recent_activity: {
    id: number;
    timestamp: string;
    action: string;
    detail: string;
    case_id?: number;
    result: string;
  }[];
}
