import type { Case, User, PoliceStation, AdminStats, PoliceDashboardStats, GraphData, TimelineEvent, AuditLogItem } from '../types';

export const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function getToken(): string {
  return localStorage.getItem('investra_token') || '';
}

export function setSession(token: string, user: User) {
  localStorage.setItem('investra_token', token);
  localStorage.setItem('investra_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('investra_token');
  localStorage.removeItem('investra_user');
}

export function getCurrentUser(): User | null {
  const raw = localStorage.getItem('investra_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function refreshCurrentUser(): Promise<User | null> {
  const token = getToken();
  if (!token) {
    clearSession();
    return null;
  }

  try {
    const user = await apiRequest<User>('/auth/me');
    setSession(token, user);
    return user;
  } catch {
    clearSession();
    return null;
  }
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'Request failed.';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      // fallback
    }
    if (response.status === 401) {
      clearSession();
      if (window.location.pathname !== '/' && !window.location.pathname.includes('/login')) {
        window.location.href = '/';
      }
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export async function apiBlob(endpoint: string): Promise<Blob> {
  const token = getToken();
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) {
    let detail = 'Request failed.';
    try {
      const payload = await response.json();
      detail = payload.detail || detail;
    } catch {
      // Keep the generic error for non-JSON responses.
    }
    throw new Error(detail);
  }
  return response.blob();
}

export const api = {
  apiRequest,

  auth: {
    policeLogin: (username: string, password: string) =>
      apiRequest<{ access_token: string; user: User }>('/auth/police/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    adminLogin: (username: string, password: string) =>
      apiRequest<{ access_token: string; user: User }>('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    getMe: () => apiRequest<User>('/auth/me'),
  },

  cases: {
    getDashboardStats: () => apiRequest<PoliceDashboardStats>('/cases/dashboard/stats'),
    list: (params?: { q?: string; status?: string }) => {
      const sp = new URLSearchParams();
      if (params?.q) sp.set('q', params.q);
      if (params?.status && params.status !== 'ALL') sp.set('status', params.status);
      const qs = sp.toString() ? `?${sp.toString()}` : '';
      return apiRequest<Case[]>(`/cases/${qs}`);
    },
    getDetail: (id: number) => apiRequest<any>(`/cases/${id}`),
    create: (data: any) =>
      apiRequest<Case>('/cases/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: any) =>
      apiRequest<Case>(`/cases/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    getGraph: (id: number) => apiRequest<GraphData>(`/cases/${id}/graph`),
    addRelationship: (caseId: number, data: { source_entity_id: number; target_entity_id: number; relationship_type: string; confidence?: number }) =>
      apiRequest<any>(`/cases/${caseId}/relationships`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getTimeline: (id: number) => apiRequest<TimelineEvent[]>(`/cases/${id}/timeline`),
    getReport: (id: number) => apiRequest<any>(`/cases/${id}/report`),
    downloadReportPdf: (id: number) => apiBlob(`/cases/${id}/report.pdf`),
    addEntity: (caseId: number, data: { entity_type: string; value: string; role?: string; metadata?: any }) =>
      apiRequest<any>(`/cases/${caseId}/entities`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  documents: {
    listByCase: (caseId: number) => apiRequest<any[]>(`/documents/case/${caseId}`),
    upload: (caseId: number, file: File) => {
      const fd = new FormData();
      fd.append('case_id', String(caseId));
      fd.append('file', file);
      return apiRequest<any>('/documents/upload', {
        method: 'POST',
        body: fd,
      });
    },
    getContent: (evidenceId: number) => apiRequest<any>(`/documents/${evidenceId}/content`),
    reindex: (evidenceId: number) =>
      apiRequest<any>(`/documents/${evidenceId}/reindex`, {
        method: 'POST',
      }),
    getDownloadUrl: (evidenceId: number) => `${API_BASE}/documents/${evidenceId}/download`,
  },

  stations: {
    list: (params?: { q?: string; status?: string }) => {
      const sp = new URLSearchParams();
      if (params?.q) sp.set('q', params.q);
      if (params?.status) sp.set('status', params.status);
      const qs = sp.toString() ? `?${sp.toString()}` : '';
      return apiRequest<PoliceStation[]>(`/stations/${qs}`);
    },
    get: (id: number) => apiRequest<PoliceStation>(`/stations/${id}`),
    create: (data: Partial<PoliceStation>) =>
      apiRequest<PoliceStation>('/stations/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<PoliceStation>) =>
      apiRequest<PoliceStation>(`/stations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    activate: (id: number) =>
      apiRequest<PoliceStation>(`/stations/${id}/activate`, {
        method: 'POST',
      }),
    deactivate: (id: number) =>
      apiRequest<PoliceStation>(`/stations/${id}/deactivate`, {
        method: 'POST',
      }),
    getOfficers: (stationId: number) => apiRequest<User[]>(`/stations/${stationId}/officers`),
    assignOfficers: (stationId: number, officerIds: number[]) =>
      apiRequest<any>(`/stations/${stationId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ officer_ids: officerIds }),
      }),
  },

  admin: {
    getStats: () => apiRequest<AdminStats>('/admin/stats'),
    getHealth: () => apiRequest<any>('/admin/health'),
    listCases: (params?: { q?: string; status?: string }) => {
      const sp = new URLSearchParams();
      if (params?.q) sp.set('q', params.q);
      if (params?.status) sp.set('status', params.status);
      const qs = sp.toString() ? `?${sp.toString()}` : '';
      return apiRequest<any[]>(`/admin/cases${qs}`);
    },
    assignCaseOfficer: (caseId: number, officerId: number, stationId?: number) =>
      apiRequest<any>(`/admin/cases/${caseId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ officer_id: officerId, station_id: stationId, permission: 'OWNER' }),
      }),
    listOfficers: (params?: { q?: string; status?: string; station?: string }) => {
      const sp = new URLSearchParams();
      if (params?.q) sp.set('q', params.q);
      if (params?.status) sp.set('status', params.status);
      if (params?.station) sp.set('station', params.station);
      const qs = sp.toString() ? `?${sp.toString()}` : '';
      return apiRequest<User[]>(`/auth/admin/officers${qs}`);
    },
    createOfficer: (data: any) =>
      apiRequest<User>('/auth/admin/officers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateOfficer: (id: number, data: any) =>
      apiRequest<User>(`/auth/admin/officers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    activateOfficer: (id: number) =>
      apiRequest<User>(`/auth/admin/officers/${id}/activate`, {
        method: 'POST',
      }),
    deactivateOfficer: (id: number) =>
      apiRequest<User>(`/auth/admin/officers/${id}/deactivate`, {
        method: 'POST',
      }),
    resetOfficerPassword: (id: number, newPassword: string) =>
      apiRequest<any>(`/auth/admin/officers/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ new_password: newPassword }),
      }),
    getOfficerCases: (id: number) => apiRequest<any[]>(`/auth/admin/officers/${id}/cases`),
    getOfficerActivity: (id: number) => apiRequest<any[]>(`/auth/admin/officers/${id}/activity`),
    listAuditLogs: (params?: { user_id?: number; case_id?: number; action?: string }) => {
      const sp = new URLSearchParams();
      if (params?.user_id) sp.set('user_id', String(params.user_id));
      if (params?.case_id) sp.set('case_id', String(params.case_id));
      if (params?.action) sp.set('action', params.action);
      const qs = sp.toString() ? `?${sp.toString()}` : '';
      return apiRequest<AuditLogItem[]>(`/auth/admin/audit-logs${qs}`);
    },
    listRAGDocuments: () => apiRequest<any[]>('/admin/rag/documents'),
    reindexRAGDocument: (id: number) =>
      apiRequest<any>(`/admin/rag/reindex/${id}`, {
        method: 'POST',
      }),
    deleteRAGDocument: (id: number) =>
      apiRequest<any>(`/admin/rag/documents/${id}`, {
        method: 'DELETE',
      }),
  },

  assistant: {
    ask: (caseId: number, query: string) =>
      apiRequest<{ answer: string; sources: { label: string; title: string; chunk_index: number; score: number }[]; warning?: string }>('/assistant/ask', {
        method: 'POST',
        body: JSON.stringify({ case_id: caseId, query }),
      }),
  },

  coordination: {
    getWorkspace: (caseId: number) => apiRequest<any>(`/coordination/cases/${caseId}/workspace`),
    sendDraft: (caseId: number, stationIds: number[], body?: string) =>
      apiRequest<any>(`/coordination/cases/${caseId}/requests/drafts`, {
        method: 'POST',
        body: JSON.stringify({ station_ids: stationIds, body }),
      }),
  },
};
