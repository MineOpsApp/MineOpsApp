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

const API_BASE_URL = 'http://192.168.0.101:8080/api';
const REQUEST_TIMEOUT_MS = 10000;

async function fetchWithTimeout(url: string, options?: RequestInit) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function request<T>(path: string): Promise<T> {
  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error('Backend request failed');
  }

  return response.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Backend request failed');
  }

  return response.json() as Promise<T>;
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

export function createSosAlert(alert: CreateSosAlertRequest) {
  return post<SosAlert>('/sos', alert);
}

export function getSosAlerts() {
  return request<SosAlert[]>('/sos');
}

export function createHazardReport(report: {
  reportedByRole: string;
  reportedByName: string;
  reportedByEmail: string;
  hazardType: string;
  site: string;
  location: string;
  description: string;
}) {
  return post<HazardReport>('/hazards', report);
}

export function getHazardReports(reportedByEmail?: string) {
  const query = reportedByEmail ? `?reportedByEmail=${encodeURIComponent(reportedByEmail)}` : '';
  return request<HazardReport[]>(`/hazards${query}`);
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
  return request<Notice[]>('/notices');
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
  return request<AuditLog[]>('/audit-logs');
}
