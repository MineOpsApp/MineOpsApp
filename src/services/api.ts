import type { DashboardData } from '../types/dashboard';
import type { Site } from '../types/site';
import type { CreateSosAlertRequest, SosAlert } from '../types/sos';
import type {
  DangerZone,
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
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
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

async function fetchWithTimeout(url: string, options?: RequestInit) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      headers: withAuthHeaders(options?.headers),
      signal: controller.signal,
    });
    return response;
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

export function getDashboard() {
  return request<DashboardData>('/dashboard');
}

export function getSites() {
  return request<Site[]>('/sites');
}

export function registerUser(payload: AuthPayload) {
  return post<AuthSession>('/auth/register', payload);
}

export function loginUser(payload: AuthPayload) {
  return post<AuthSession>('/auth/login', payload);
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

export function getHazardReports(reportedByEmail?: string) {
  const query = reportedByEmail ? `?reportedByEmail=${encodeURIComponent(reportedByEmail)}` : '';
  return request<{ content: HazardReport[] }>(`/hazards${query}`).then((page) => page.content);
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
}) {
  return post<any>('/shift-logs', payload);
}

export function getMyShiftLogs() {
  return request<any[]>('/shift-logs/mine');
}

export function getSiteShiftLogs() {
  return request<{ content: any[] }>('/shift-logs').then((page) => page.content);
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