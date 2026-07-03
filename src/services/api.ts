import type { DashboardData } from '../types/dashboard';
import type { Site } from '../types/site';
import type { CreateSosAlertRequest, SosAlert } from '../types/sos';
import type {
  DangerZone,
  EmergencyContact,
  EquipmentFault,
  AuditLog,
  HazardReport,
  MaintenanceRequest,
  Notice,
  SupervisorMessage,
  VisitorInduction,
  WorkerEquipment,
  WorkerProfile,
} from '../types/actions';

import type { AuthPayload, AuthSession } from '../types/auth';
import type { AuthUser } from '../types/auth';

const API_BASE_URL = 'http://172.20.10.4:8080/api';
const AUDIT_API_BASE_URL = API_BASE_URL.replace(':8080/api', ':8081/api');
const REQUEST_TIMEOUT_MS = 30000;
const REFRESH_THRESHOLD_SECS = 30 * 60;

let authToken: string | null = null;
let tokenExpiresAt: number | null = null;
let isRefreshing = false;

function parseTokenExp(token: string): number | null {
  try {
    const b64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!b64) return null;
    const payload = JSON.parse(atob(b64));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null) {
  authToken = token;
  tokenExpiresAt = token ? parseTokenExp(token) : null;
}

async function maybeRefresh(): Promise<void> {
  if (!authToken || !tokenExpiresAt || isRefreshing) return;
  const secsUntilExpiry = tokenExpiresAt - Math.floor(Date.now() / 1000);
  if (secsUntilExpiry > REFRESH_THRESHOLD_SECS) return;
  isRefreshing = true;
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      signal: controller.signal,
    });
    clearTimeout(id);
    if (res.ok) {
      const data = await res.json();
      if (data.token) setAuthToken(data.token);
    }
  } catch {
    // silent — let the original request proceed and fail naturally if needed
  } finally {
    isRefreshing = false;
  }
}

function withAuthHeaders(headers?: HeadersInit): HeadersInit {
  const nextHeaders: Record<string, string> = {};

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      nextHeaders[key] = value;
    });
  } else if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => {
      nextHeaders[key] = value;
    });
  } else if (headers) {
    Object.assign(nextHeaders, headers);
  }

  if (authToken) {
    nextHeaders.Authorization = `Bearer ${authToken}`;
  }

  return nextHeaders;
}

async function fetchWithTimeout(url: string, options?: RequestInit & { skipAuth?: boolean }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      headers: options?.skipAuth ? (options?.headers ?? {}) : withAuthHeaders(options?.headers),
      signal: controller.signal,
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Request timed out — server may be unreachable');
    }
    throw new Error('Could not connect to server — check your connection');
  } finally {
    clearTimeout(timeoutId);
  }
}

async function request<T>(path: string): Promise<T> {
  await maybeRefresh();
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}${path}`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${response.status}: ${text}`);
    }
    return response.json() as Promise<T>;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Request timed out. Check your connection.');
    }
    if (error?.message?.includes('Network request failed')) {
      throw new Error('Cannot reach server. Check your connection.');
    }
    throw error;
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  await maybeRefresh();
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${response.status}: ${text}`);
    }
    return response.json() as Promise<T>;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Request timed out. Check your connection.');
    }
    if (error?.message?.includes('Network request failed')) {
      throw new Error('Cannot reach server. Check your connection.');
    }
    throw error;
  }
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  await maybeRefresh();
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'PATCH',
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${response.status}: ${text}`);
    }
    return response.json() as Promise<T>;
  } 
catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Request timed out. Check your connection.');
    }
    if (error?.message?.includes('Network request failed')) {
      throw new Error('Cannot reach server. Check your connection.');
    }
    throw error;
  }
}

async function postPublic<T>(path: string, body: unknown): Promise<T> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      skipAuth: true,
    });
    if (!response.ok) {
      const statusCode = response.status;
      let text = '';
      try { text = await response.text(); } catch {}
      throw new Error(`${statusCode}: ${text}`);
    }
    const json = await response.json();
    if (json.error) {
      throw new Error(`LOGIN_ERROR: ${json.error}`);
    }
    return json as T;
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('Request timed out. Check your connection.');
    if (error?.message?.includes('Network request failed')) throw new Error('Cannot reach server. Check your connection.');
    throw error;
  }
}

async function del<T>(path: string): Promise<T> {
  await maybeRefresh();
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      const statusCode = response.status;
      let text = '';
      try { text = await response.text(); } catch {}
      throw new Error(`${statusCode}: ${text}`);
    }
    return response.json() as Promise<T>;
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('Request timed out. Check your connection.');
    if (error?.message?.includes('Network request failed')) throw new Error('Cannot reach server. Check your connection.');
    throw error;
  }
}

async function put<T>(path: string, body: unknown): Promise<T> {
  await maybeRefresh();
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const statusCode = response.status;
      let text = '';
      try { text = await response.text(); } catch {}
      throw new Error(`${statusCode}: ${text}`);
    }
    return response.json() as Promise<T>;
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('Request timed out. Check your connection.');
    if (error?.message?.includes('Network request failed')) throw new Error('Cannot reach server. Check your connection.');
    throw error;
  }
}

export function getDashboard() {
  return request<DashboardData>('/dashboard');
}

export function getSites() {
  return request<Site[]>('/sites');
}

export function registerUser(payload: AuthPayload) {
  setAuthToken(null);
  return postPublic<any>('/auth/register', payload);
}

export function loginUser(payload: AuthPayload) {
  setAuthToken(null);
  return postPublic<AuthSession>('/auth/login', payload);
}

export function renewGuestSession(email: string, hours: number) {
  return post<{ email: string; fullName: string; sessionExpiresAt: string; hoursGranted: number }>(
    '/admin/guests/renew',
    { email, hours }
  );
}

export function getMarketPrices() {
  return request<any[]>('/market/prices');
}

export function createSosAlert(alert: CreateSosAlertRequest) {
  return post<SosAlert>('/sos', alert);
}

export function getSosAlerts() {
  return request<{ content: SosAlert[] }>('/sos').then((page) => page.content);
}

export function getDangerZones() {
  return request<{ content: DangerZone[] }>('/danger-zones').then((page) => page.content);
}

export function createHazardReport(report: {
  reportedByRole: string;
  reportedByName: string;
  reportedByEmail: string;
  hazardType: string;
  site: string;
  location: string;
  description: string;
  severity?: string;
  latitude?: number; longitude?: number;
  photoData?: string
}) {
  return post<HazardReport>('/hazards', report);
}

export function getHazardReports(reportedByEmail?: string, page = 0) {
  const query = reportedByEmail 
    ? `?reportedByEmail=${encodeURIComponent(reportedByEmail)}&page=${page}` 
    : `?page=${page}`;
  return request<any>(`/hazards${query}`);
}

export function getSiteHazardAlerts() {
  return request<{ content: HazardReport[] }>('/hazards').then((page) => page.content);
}

export function getSiteHazardReports(page = 0) {
  return request<any>(`/hazards?page=${page}`);
}

export function reviewHazardReport(id: number, payload: {
  actorRole: string;
  actorName: string;
  actorEmail: string;
  actionTaken: string;
}) {
  return fetchWithTimeout(`${API_BASE_URL}/hazards/${id}/review`, {
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'PATCH',
  }).then((response) => {
    if (!response.ok) {
      throw new Error('Backend request failed');
    }

    return response.json() as Promise<HazardReport>;
  });
}
  export function logEquipmentShift(payload: {
  equipmentCode: string;
  equipmentName: string;
  status: string;
  checkType: string;
  notes?: string;
}) {
  return post<any>('/workers/equipment/shift-log', payload);
}

export function getEquipmentShiftLogs() {
  return request<any[]>('/workers/equipment/shift-logs');
}

export function submitShiftLog(payload: {
  zone: string;
  shiftType: string;
  mineralType: string;
  volumeExtracted: number;
  unit: string;
  equipmentCode: string;
  equipmentName: string;
  notes?: string;
  shiftDate?: string;
}) {
  return post<any>('/shift-logs', payload);
}

export function getMyShiftLogs() {
  return request<any[]>('/shift-logs/mine');
}

export function getSiteShiftLogs() {
  return request<{ content: ShiftLog[] }>('/shift-logs').then((page) => page.content);
}

export function closeHazardReport(id: number, payload: {
  actorRole: string;
  actorName: string;
  actorEmail: string;
  actionTaken: string;
}) {
  return fetchWithTimeout(`${API_BASE_URL}/hazards/${id}/close`, {
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'PATCH',
  }).then((response) => {
    if (!response.ok) {
      throw new Error('Backend request failed');
    }

    return response.json() as Promise<HazardReport>;
  });
}

export function createSupervisorMessage(message: {
  senderRole: string;
  actorName: string;
  actorEmail: string;
  audience: string;
  message: string;
}) {
  return post<SupervisorMessage>('/messages', message);
}

export function createDangerZone(zone: {
  actorRole: string;
  actorName: string;
  actorEmail: string;
  site: string;
  zoneName: string;
  riskLevel: string;
}) {
  return post<DangerZone>('/danger-zones', zone);
}

export function completeVisitorInduction(induction: {
  actorRole: string;
  actorName: string;
  actorEmail: string;
  visitorType: string;
  site: string;
}) {
  return post<VisitorInduction>('/inductions', induction);
}

export function getNotices() {
  return request<{ content: Notice[] }>('/notices').then((page) => page.content);
}

export function createNotice(notice: {
  title: string;
  message: string;
  postedByRole: string;
  actorName: string;
  actorEmail: string;
  category?: string;
  expiresAt?: string;
}) {
  return post<Notice>('/notices', notice);
}

export function markNoticeSeen(id: number, user: AuthUser) {
  return post<Notice>(`/notices/${id}/seen`, {
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  });
}

export function getWorkerProfile(email: string) {
  return request<WorkerProfile>(`/workers/me?email=${encodeURIComponent(email)}`);
}

export function updateWorkerEquipmentStatus(equipmentId: number, status: string, actorName: string) {
  return fetchWithTimeout(`${API_BASE_URL}/workers/equipment/status`, {
    body: JSON.stringify({ actorName, equipmentId: String(equipmentId), status }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'PATCH',
  }).then((response) => {
    if (!response.ok) {
      throw new Error('Backend request failed');
    }

    return response.json() as Promise<WorkerEquipment>;
  });
}

export function reportEquipmentFault(payload: {
  workerEmail: string;
  workerName: string;
  equipmentCode: string;
  description: string;
}) {
  return post<EquipmentFault>('/workers/equipment/faults', payload);
}

export function requestEquipmentMaintenance(payload: {
  workerEmail: string;
  workerName: string;
  equipmentCode: string;
  requestDetails: string;
}) {
  return post<MaintenanceRequest>('/workers/equipment/maintenance', payload);
}

export function getAuditLogs() {
  return fetchWithTimeout(`${AUDIT_API_BASE_URL}/audit-logs`).then((response) => {
    if (!response.ok) {
      throw new Error('Backend request failed');
    }

    return response.json() as Promise<AuditLog[]>;
  });
}

export function searchAuditLogs(params: { action?: string; actorEmail?: string; from?: string; to?: string }) {
  const q = new URLSearchParams();
  if (params.action?.trim()) q.set('action', params.action.trim());
  if (params.actorEmail?.trim()) q.set('actorEmail', params.actorEmail.trim());
  if (params.from?.trim()) q.set('from', params.from.trim());
  if (params.to?.trim()) q.set('to', params.to.trim());
  const qs = q.toString();
  return fetchWithTimeout(`${AUDIT_API_BASE_URL}/audit-logs/search${qs ? '?' + qs : ''}`)
    .then((r) => { if (!r.ok) throw new Error('Search failed'); return r.json() as Promise<AuditLog[]>; });
}

export function exportAuditLogsCsv(params: { action?: string; actorEmail?: string; from?: string; to?: string }) {
  const q = new URLSearchParams();
  if (params.action?.trim()) q.set('action', params.action.trim());
  if (params.actorEmail?.trim()) q.set('actorEmail', params.actorEmail.trim());
  if (params.from?.trim()) q.set('from', params.from.trim());
  if (params.to?.trim()) q.set('to', params.to.trim());
  const qs = q.toString();
  return fetchWithTimeout(`${AUDIT_API_BASE_URL}/audit-logs/export/csv${qs ? '?' + qs : ''}`)
    .then((r) => { if (!r.ok) throw new Error('Export failed'); return r.text(); });
}

export function startDrillOperation(payload: { zone: string; drillType: string; equipmentCode: string }) {
  return post<any>('/drill-operations', payload);
}

export function signOffDrillStep(id: number, payload: { step: string; notes?: string }) {
  return post<any>(`/drill-operations/${id}/sign-off`, payload);
}

export function getMyDrillOperations() {
  return request<any[]>('/drill-operations/mine');
}
export function getSiteDrillOperations() {
  return request<any[]>('/drill-operations');
}

export function createGuestAccount(payload: {
  fullName: string;
  email: string;
  password: string;
  guestSubRole: string;
  assignedSite: string;
  sessionHours: number;
  createdByEmail: string;
  createdByName: string;
}) {
  return post<any>('/admin/guests/create', payload);
}

export function savePushToken(token: string) {
  return post<any>('/auth/push-token', { token });
}

export function clockIn(zone?: string, notes?: string) {
  return post<any>('/attendance/clock-in', { zone, notes });
}

export function clockOut() {
  return post<any>('/attendance/clock-out', {});
}

export function getMyAttendanceStatus() {
  return request<{ onSite: boolean; record: any }>('/attendance/me');
}

export function getSiteRoster() {
  return request<any[]>('/attendance/roster');
}

export function getMyAttendanceHistory() {
  return request<any[]>('/attendance/history');
}

export function scheduleBlast(payload: { zone: string; blastTime: string; notes?: string }) {
  return post<any>('/blasts', payload);
}

export function getScheduledBlasts() {
  return request<any[]>('/blasts');
}

export function getAllBlasts() {
  return request<any[]>('/blasts/all');
}

export function cancelBlast(id: number) {
  return patch<any>(`/blasts/${id}/cancel`, {});
}

export function executeBlast(id: number) {
  return post<any>(`/blasts/${id}/execute`, {});
}

export function createIncident(payload: {
  zone: string;
  category: string;
  severity: string;
  description: string;
  involvedPersons?: string;
  firstAidGiven?: boolean;
  hospitalRequired?: boolean;
  immediateAction?: string;
  latitude?: number;
  longitude?: number;
  photoData?: string;
  incidentAt?: string;
}) {
  return post<any>('/incidents', payload);
}

export function getMyIncidents() {
  return request<any[]>('/incidents/mine');
}

export function getSiteIncidents() {
  return request<any[]>('/incidents');
}


export function getWorkerBlastHistory() {
  return request<any[]>('/blasts/all');
}

export function getBlastHistory() {
  return request<any[]>('/blasts/history');
}

export function updateIncidentStatus(id: number, status: string, notes?: string) {
  return patch<any>(`/incidents/${id}/status`, { status, notes });
}

export function getGuestList() {
  return request<any[]>('/admin/guests');
}

export function resetUserPassword(email: string) {
  return post<{ email: string; fullName: string; temporaryPassword: string }>('/admin/users/reset-password', { email });
}

export function suspendUser(email: string, suspend: boolean) {
  return post<any>('/admin/users/suspend', { email, suspend: suspend ? 'true' : 'false' });
}

export function getSiteEquipment() {
  return request<any[]>('/equipment');
}

export function addEquipment(payload: { code: string; name: string; type: string; notes?: string }) {
  return post<any>('/equipment', payload);
}

export function updateEquipmentRegistryStatus(id: number, status: string, notes?: string) {
  return patch<any>(`/equipment/${id}/status`, { status, notes });
}

export function deleteNotice(id: number) {
  return del<any>(`/notices/${id}`);
}

export function getPendingWorkers() {
  return request<any[]>('/admin/workers/pending');
}

export function approveWorker(email: string) {
  return post<any>('/admin/workers/approve', { email });
}

export function rejectWorker(email: string) {
  return post<any>('/admin/workers/reject', { email });
}

export function getMyEmergencyContacts() {
  return request<EmergencyContact[]>('/emergency-contacts');
}

export function saveEmergencyContact(payload: {
  contactType: 'PRIMARY' | 'BACKUP';
  name: string;
  relationship: string;
  phone: string;
}) {
  return post<EmergencyContact>('/emergency-contacts', payload);
}

export function deleteEmergencyContact(id: number) {
  return del<void>(`/emergency-contacts/${id}`);
}

export function getWorkerEmergencyContacts(workerEmail: string) {
  return request<EmergencyContact[]>(`/emergency-contacts/worker/email/${encodeURIComponent(workerEmail)}`);
}

export type WorkerDirectoryEntry = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  contactCount: number;
};

export function getWorkerContactDirectory() {
  return request<WorkerDirectoryEntry[]>('/emergency-contacts/directory');
}

export type SafetyChecklist = {
  id: number;
  workerId: number;
  workerName: string;
  workerEmail: string;
  site: string;
  shiftDate: string;
  ppeHelmet: boolean;
  ppeBoots: boolean;
  ppeGloves: boolean;
  ppeVest: boolean;
  equipmentChecked: boolean;
  communicationDevice: boolean;
  emergencyExitsClear: boolean;
  hazardousMaterialsSecured: boolean;
  allCleared: boolean;
  submittedAt: string;
};

export type ChecklistPayload = {
  ppeHelmet: boolean;
  ppeBoots: boolean;
  ppeGloves: boolean;
  ppeVest: boolean;
  equipmentChecked: boolean;
  communicationDevice: boolean;
  emergencyExitsClear: boolean;
  hazardousMaterialsSecured: boolean;
};

export type PendingWorker = { workerName: string; workerEmail: string; zone: string };

export type SiteTodayChecklist = {
  date: string;
  submitted: SafetyChecklist[];
  pending: PendingWorker[];
};

export function submitSafetyChecklist(payload: ChecklistPayload) {
  return post<SafetyChecklist>('/safety-checklist', payload);
}

export function getMyChecklistToday() {
  return request<SafetyChecklist | null>('/safety-checklist/my/today');
}

export function getSiteChecklistToday() {
  return request<SiteTodayChecklist>('/safety-checklist/site/today');
}

export type FirstAidKit = {
  id: number;
  site: string;
  zone: string;
  location: string;
  hasBandages: boolean;
  hasGloves: boolean;
  hasAntiseptic: boolean;
  hasOxygen: boolean;
  hasStretcher: boolean;
  fullyStocked: boolean;
  notes: string | null;
  lastCheckedBy: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
};

export type FirstAidKitPayload = {
  zone: string;
  location: string;
  hasBandages: boolean;
  hasGloves: boolean;
  hasAntiseptic: boolean;
  hasOxygen: boolean;
  hasStretcher: boolean;
  notes: string;
};

export function getFirstAidKits() {
  return request<FirstAidKit[]>('/first-aid-kits');
}

export function upsertFirstAidKit(payload: FirstAidKitPayload) {
  return post<FirstAidKit>('/first-aid-kits', payload);
}

export function updateFirstAidKit(id: number, payload: FirstAidKitPayload) {
  return put<FirstAidKit>(`/first-aid-kits/${id}`, payload);
}

export function deleteFirstAidKit(id: number) {
  return del<void>(`/first-aid-kits/${id}`);
}

export type ShiftLog = {
  id: number;
  workerEmail: string;
  workerName: string;
  site: string;
  zone: string;
  shiftType: string;
  mineralType: string;
  volumeExtracted: number;
  unit: string;
  equipmentCode: string;
  equipmentName: string;
  notes: string;
  status: string;
  shiftDate: string;
  submittedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
};

// Shift log approval
export function approveShiftLog(id: number) {
  return request<ShiftLog>(`/shift-logs/${id}/approve`, { method: 'PATCH' });
}

export function rejectShiftLog(id: number) {
  return request<ShiftLog>(`/shift-logs/${id}/reject`, { method: 'PATCH' });
}

// Mineral inventory
export type MineralInventory = {
  id: number;
  site: string;
  mineralType: string;
  unit: string;
  totalVolume: number;
  lastUpdatedAt: string;
  lastShiftLogId: number | null;
  lastWorkerName: string | null;
  lastZone: string | null;
};

export type InventoryTransaction = {
  id: number;
  site: string;
  mineralType: string;
  unit: string;
  volumeAdded: number;
  shiftLogId: number;
  workerName: string;
  workerEmail: string;
  zone: string;
  approvedBy: string;
  createdAt: string;
};

export function getSiteInventory() {
  return request<MineralInventory[]>('/inventory');
}

export function getSiteInventoryHistory(page = 0, size = 20) {
  return request<{ content: InventoryTransaction[]; totalElements: number }>(
    `/inventory/history?page=${page}&size=${size}`
  );
}

export function getMyInventoryContributions() {
  return request<InventoryTransaction[]>('/inventory/my-contributions');
}

// Certifications
export type Certification = {
  id: number;
  workerId: number;
  workerName: string;
  workerEmail: string;
  site: string;
  certificationName: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate: string;
  status: string; // VALID | EXPIRING_SOON | EXPIRED
  daysUntilExpiry: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

export type CertificationHistory = {
  id: number;
  certificationId: number;
  previousExpiry: string | null;
  newExpiry: string;
  previousAuthority: string | null;
  newAuthority: string | null;
  renewedBy: string;
  renewedAt: string;
  notes: string | null;
};

export type CertificationPayload = {
  workerId?: number;
  certificationName: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate: string;
  notes?: string;
};

export function getSiteCertifications(status?: string, type?: string) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (type) params.append('type', type);
  const qs = params.toString();
  return request<Certification[]>(`/certifications${qs ? '?' + qs : ''}`);
}

export function getMyCertifications() {
  return request<Certification[]>('/certifications/mine');
}

export function getCertificationHistory(id: number) {
  return request<CertificationHistory[]>(`/certifications/${id}/history`);
}

export function addCertification(payload: CertificationPayload) {
  return post<Certification>('/certifications', payload);
}

export function updateCertification(id: number, payload: CertificationPayload) {
  return put<Certification>(`/certifications/${id}`, payload);
}

export function deleteCertification(id: number) {
  return del<void>(`/certifications/${id}`);
}