import type { DashboardData } from '../types/dashboard';
import type { Site } from '../types/site';
import type { CreateSosAlertRequest, SosAlert } from '../types/sos';
import type { DangerZone, HazardReport, SupervisorMessage, VisitorInduction } from '../types/actions';
import type { AuthPayload, AuthSession } from '../types/auth';

const API_BASE_URL = 'http://192.168.0.101:8080/api';

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error('Backend request failed');
  }

  return response.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
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
  site: string;
  description: string;
}) {
  return post<HazardReport>('/hazards', report);
}

export function getHazardReports() {
  return request<HazardReport[]>('/hazards');
}

export function closeHazardReport(id: number) {
  return fetch(`${API_BASE_URL}/hazards/${id}/close`, {
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
  audience: string;
  message: string;
}) {
  return post<SupervisorMessage>('/messages', message);
}

export function createDangerZone(zone: {
  site: string;
  zoneName: string;
  riskLevel: string;
}) {
  return post<DangerZone>('/danger-zones', zone);
}

export function completeVisitorInduction(induction: {
  visitorType: string;
  site: string;
}) {
  return post<VisitorInduction>('/inductions', induction);
}
