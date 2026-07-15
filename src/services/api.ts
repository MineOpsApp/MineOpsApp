import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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
  ShiftAnnouncement,
  SupervisorMessage,
  VisitorInduction,
  WorkerEquipment,
  WorkerMessage,
  WorkerProfile,
} from '../types/actions';

import type { AuthPayload, AuthSession } from '../types/auth';
import type { AuthUser } from '../types/auth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api';
const AUDIT_API_BASE_URL = API_BASE_URL.replace(':8080/api', ':8081/api');
const REQUEST_TIMEOUT_MS = 30000;
const REFRESH_THRESHOLD_SECS = 5 * 60; // refresh access token when < 5 min left

const SECURE_REFRESH_KEY = 'mineops_refresh_token';
const SECURE_EMAIL_KEY = 'mineops_session_email';

let authToken: string | null = null;
let tokenExpiresAt: number | null = null;
let storedRefreshToken: string | null = null;
let isRefreshing = false;
let sessionExpiredListener: (() => void) | null = null;

export function onSessionExpired(listener: () => void) {
  sessionExpiredListener = listener;
}

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

// Extracts a user-readable message from api error strings like "400: {"message":"..."}"
export function parseApiError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  try {
    const jsonStart = msg.indexOf('{');
    if (jsonStart >= 0) {
      const parsed = JSON.parse(msg.slice(jsonStart));
      if (parsed.message) return parsed.message;
      if (parsed.detail) return parsed.detail;
    }
  } catch {}
  const colonIdx = msg.indexOf(': ');
  if (colonIdx >= 0) return msg.slice(colonIdx + 2);
  return msg || 'Something went wrong. Try again.';
}

export function setAuthToken(token: string | null, refreshToken?: string | null) {
  authToken = token;
  tokenExpiresAt = token ? parseTokenExp(token) : null;
  if (refreshToken !== undefined) {
    storedRefreshToken = refreshToken;
  }
}

async function persistRefreshToken(rawToken: string, email: string) {
  await SecureStore.setItemAsync(SECURE_REFRESH_KEY, rawToken);
  await SecureStore.setItemAsync(SECURE_EMAIL_KEY, email);
}

async function clearPersistedTokens() {
  await SecureStore.deleteItemAsync(SECURE_REFRESH_KEY);
  await SecureStore.deleteItemAsync(SECURE_EMAIL_KEY);
}

export async function getStoredEmail(): Promise<string | null> {
  return SecureStore.getItemAsync(SECURE_EMAIL_KEY);
}

async function doTokenRefresh(): Promise<boolean> {
  const rt = storedRefreshToken ?? await SecureStore.getItemAsync(SECURE_REFRESH_KEY);
  if (!rt) return false;
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
      signal: controller.signal,
    });
    clearTimeout(id);
    if (!res.ok) {
      await clearPersistedTokens();
      storedRefreshToken = null;
      return false;
    }
    const data = await res.json();
    if (data.error || !data.token || !data.refreshToken) {
      await clearPersistedTokens();
      storedRefreshToken = null;
      return false;
    }
    authToken = data.token;
    tokenExpiresAt = parseTokenExp(data.token);
    storedRefreshToken = data.refreshToken;
    if (data.user?.email) {
      await persistRefreshToken(data.refreshToken, data.user.email);
    }
    return true;
  } catch {
    return false;
  }
}

async function maybeRefresh(): Promise<void> {
  if (!authToken || !tokenExpiresAt || isRefreshing) return;
  const secsUntilExpiry = tokenExpiresAt - Math.floor(Date.now() / 1000);
  if (secsUntilExpiry > REFRESH_THRESHOLD_SECS) return;
  isRefreshing = true;
  try {
    await doTokenRefresh();
  } finally {
    isRefreshing = false;
  }
}

export async function tryRestoreSession(): Promise<AuthSession | null> {
  const rt = await SecureStore.getItemAsync(SECURE_REFRESH_KEY);
  if (!rt) return null;
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
      signal: controller.signal,
    });
    clearTimeout(id);
    if (!res.ok) { await clearPersistedTokens(); return null; }
    const data = await res.json();
    if (data.error || !data.token || !data.refreshToken || !data.user) {
      await clearPersistedTokens();
      return null;
    }
    await persistRefreshToken(data.refreshToken, data.user.email);
    return { token: data.token, refreshToken: data.refreshToken, user: data.user };
  } catch {
    return null;
  }
}

export async function logout(refreshToken?: string) {
  const rt = refreshToken ?? storedRefreshToken ?? await SecureStore.getItemAsync(SECURE_REFRESH_KEY);
  try {
    if (rt) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
    }
  } catch { /* best effort */ }
  authToken = null;
  tokenExpiresAt = null;
  storedRefreshToken = null;
  await clearPersistedTokens();
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

async function handleResponse<T>(response: Response, retry: () => Promise<Response>): Promise<T> {
  if (response.status === 401) {
    if (isRefreshing) {
      // another refresh in flight — just fail this one
      sessionExpiredListener?.();
      throw new Error('Session expired. Please sign in again.');
    }
    isRefreshing = true;
    const refreshed = await doTokenRefresh().finally(() => { isRefreshing = false; });
    if (refreshed) {
      const retryRes = await retry();
      if (!retryRes.ok) {
        const text = await retryRes.text();
        throw new Error(`${retryRes.status}: ${text}`);
      }
      return retryRes.json() as Promise<T>;
    }
    sessionExpiredListener?.();
    throw new Error('Session expired. Please sign in again.');
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status}: ${text}`);
  }
  return response.json() as Promise<T>;
}

async function request<T>(path: string): Promise<T> {
  await maybeRefresh();
  try {
    const doFetch = () => fetchWithTimeout(`${API_BASE_URL}${path}`);
    const response = await doFetch();
    return handleResponse<T>(response, doFetch);
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('Request timed out. Check your connection.');
    if (error?.message?.includes('Network request failed')) throw new Error('Cannot reach server. Check your connection.');
    throw error;
  }
}

async function requestText(path: string): Promise<string> {
  await maybeRefresh();
  try {
    const doFetch = () => fetchWithTimeout(`${API_BASE_URL}${path}`);
    const response = await doFetch();
    if (response.status === 401) {
      const refreshed = await doTokenRefresh();
      if (refreshed) {
        const retryRes = await doFetch();
        if (!retryRes.ok) throw new Error(`${retryRes.status}: ${await retryRes.text()}`);
        return retryRes.text();
      }
      sessionExpiredListener?.();
      throw new Error('Session expired. Please sign in again.');
    }
    if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
    return response.text();
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('Request timed out. Check your connection.');
    if (error?.message?.includes('Network request failed')) throw new Error('Cannot reach server. Check your connection.');
    throw error;
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  await maybeRefresh();
  try {
    const opts = { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' }, method: 'POST' } as const;
    const doFetch = () => fetchWithTimeout(`${API_BASE_URL}${path}`, opts);
    return handleResponse<T>(await doFetch(), doFetch);
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('Request timed out. Check your connection.');
    if (error?.message?.includes('Network request failed')) throw new Error('Cannot reach server. Check your connection.');
    throw error;
  }
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  await maybeRefresh();
  try {
    const opts = { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' }, method: 'PATCH' } as const;
    const doFetch = () => fetchWithTimeout(`${API_BASE_URL}${path}`, opts);
    return handleResponse<T>(await doFetch(), doFetch);
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('Request timed out. Check your connection.');
    if (error?.message?.includes('Network request failed')) throw new Error('Cannot reach server. Check your connection.');
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
    const opts = { method: 'DELETE', headers: { 'Content-Type': 'application/json' } } as const;
    const doFetch = () => fetchWithTimeout(`${API_BASE_URL}${path}`, opts);
    return handleResponse<T>(await doFetch(), doFetch);
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('Request timed out. Check your connection.');
    if (error?.message?.includes('Network request failed')) throw new Error('Cannot reach server. Check your connection.');
    throw error;
  }
}

async function put<T>(path: string, body: unknown): Promise<T> {
  await maybeRefresh();
  try {
    const opts = { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } as const;
    const doFetch = () => fetchWithTimeout(`${API_BASE_URL}${path}`, opts);
    return handleResponse<T>(await doFetch(), doFetch);
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('Request timed out. Check your connection.');
    if (error?.message?.includes('Network request failed')) throw new Error('Cannot reach server. Check your connection.');
    throw error;
  }
}

async function auditRequest<T>(path: string): Promise<T> {
  await maybeRefresh();
  try {
    const doFetch = () => fetchWithTimeout(`${AUDIT_API_BASE_URL}${path}`);
    return handleResponse<T>(await doFetch(), doFetch);
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('Request timed out. Check your connection.');
    if (error?.message?.includes('Network request failed')) throw new Error('Cannot reach server. Check your connection.');
    throw error;
  }
}

async function auditRequestText(path: string): Promise<string> {
  await maybeRefresh();
  try {
    const doFetch = () => fetchWithTimeout(`${AUDIT_API_BASE_URL}${path}`);
    const res = await doFetch();
    if (!res.ok) throw new Error(`Audit request failed: ${res.status}`);
    return res.text();
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('Request timed out. Check your connection.');
    if (error?.message?.includes('Network request failed')) throw new Error('Cannot reach server. Check your connection.');
    throw error;
  }
}

export function getSites() {
  return request<Site[]>('/sites');
}

function getDeviceInfo() {
  const deviceName = Device.deviceName ?? Device.modelName ?? undefined;
  const platform = Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : Platform.OS;
  return { deviceName, platform };
}

export function registerUser(payload: AuthPayload) {
  setAuthToken(null);
  return postPublic<any>('/auth/register', { ...payload, ...getDeviceInfo() });
}

export async function loginUser(payload: AuthPayload): Promise<AuthSession> {
  setAuthToken(null);
  const session = await postPublic<AuthSession>('/auth/login', { ...payload, ...getDeviceInfo() });
  if (session.refreshToken && session.user?.email) {
    storedRefreshToken = session.refreshToken;
    await persistRefreshToken(session.refreshToken, session.user.email);
  }
  return session;
}

export type ActiveSession = {
  id: number;
  deviceName: string;
  platform: string | null;
  createdAt: string;
  lastUsedAt: string;
};

export function getMySessions() {
  return request<ActiveSession[]>('/auth/sessions');
}

export function revokeSession(id: number) {
  return post<{ success: boolean }>(`/auth/sessions/${id}/revoke`, {});
}

export type NotificationPreferences = { notifyHazard: boolean; notifyNotice: boolean };

export function getNotificationPreferences() {
  return request<NotificationPreferences>('/profile/notification-preferences');
}

export function updateNotificationPreferences(prefs: Partial<NotificationPreferences>) {
  return put<NotificationPreferences>('/profile/notification-preferences', prefs);
}

export type AccountExport = Record<string, unknown>;

export function exportMyData() {
  return request<AccountExport>('/account/export');
}

export function deleteMyAccount(password: string) {
  return post<{ success: boolean }>('/account/delete', { password });
}

export function renewGuestSession(email: string, hours: number) {
  return post<{ email: string; fullName: string; sessionExpiresAt: string; hoursGranted: number }>(
    '/admin/guests/renew',
    { email, hours }
  );
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
  photoData?: string;
  clientRequestId?: string;
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
  return patch<HazardReport>(`/hazards/${id}/review`, payload);
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
  clientRequestId?: string;
}) {
  return post<any>('/shift-logs', payload);
}

export function getMyShiftLogs() {
  return request<any[]>('/shift-logs/mine');
}

export function getSiteShiftLogs(params?: {
  dateFrom?: string;
  dateTo?: string;
  mineralType?: string;
  workerName?: string;
  status?: string;
}) {
  const entries = Object.entries(params ?? {}).filter(([, v]) => v != null && v !== '') as [string, string][];
  const qs = entries.length ? '?' + new URLSearchParams(entries).toString() : '';
  return request<ShiftLog[]>(`/shift-logs${qs}`);
}

export function closeHazardReport(id: number, payload: {
  actorRole: string;
  actorName: string;
  actorEmail: string;
  actionTaken: string;
}) {
  return patch<HazardReport>(`/hazards/${id}/close`, payload);
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
  return patch<WorkerEquipment>('/workers/equipment/status', { actorName, equipmentId: String(equipmentId), status });
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
  return auditRequest<AuditLog[]>('/audit-logs');
}

export function searchAuditLogs(params: { action?: string; actorEmail?: string; from?: string; to?: string }) {
  const q = new URLSearchParams();
  if (params.action?.trim()) q.set('action', params.action.trim());
  if (params.actorEmail?.trim()) q.set('actorEmail', params.actorEmail.trim());
  if (params.from?.trim()) q.set('from', params.from.trim());
  if (params.to?.trim()) q.set('to', params.to.trim());
  const qs = q.toString();
  return auditRequest<AuditLog[]>(`/audit-logs/search${qs ? '?' + qs : ''}`);
}

export function exportAuditLogsCsv(params: { action?: string; actorEmail?: string; from?: string; to?: string }) {
  const q = new URLSearchParams();
  if (params.action?.trim()) q.set('action', params.action.trim());
  if (params.actorEmail?.trim()) q.set('actorEmail', params.actorEmail.trim());
  if (params.from?.trim()) q.set('from', params.from.trim());
  if (params.to?.trim()) q.set('to', params.to.trim());
  const qs = q.toString();
  return auditRequestText(`/audit-logs/export/csv${qs ? '?' + qs : ''}`);
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

export function createStaffAccount(payload: {
  fullName: string;
  email: string;
  password: string;
  role: 'supervisor' | 'safetyOfficer';
  assignedSite: string;
}) {
  return post<any>('/admin/staff/create', payload);
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

export function changePassword(currentPassword: string, newPassword: string) {
  return post<{ success: boolean }>('/auth/change-password', { currentPassword, newPassword });
}

export function savePushToken(token: string) {
  return post<any>('/auth/push-token', { token });
}

export function clockIn(zone?: string, notes?: string, clientRequestId?: string) {
  return post<any>('/attendance/clock-in', { zone, notes, clientRequestId });
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
  clientRequestId?: string;
}) {
  return post<any>('/incidents', payload);
}

export function getMyIncidents() {
  return request<any[]>('/incidents/mine');
}

export function getSiteIncidents() {
  return request<any[]>('/incidents');
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
  return patch<ShiftLog>(`/shift-logs/${id}/approve`, {});
}

export function rejectShiftLog(id: number) {
  return patch<ShiftLog>(`/shift-logs/${id}/reject`, {});
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

// User profiles with photo ID
export type UserProfile = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  assignedSite: string;
  profilePhoto: string | null;
  bio: string | null;
  createdAt: string;
  active: boolean | null;
  shiftLogCount: number;
  certificationCount: number;
  emergencyContactCount: number;
  momoNumber: string | null;
  momoNetwork: string | null;
  insuranceStatus?: string;
  businessName?: string | null;
  goldbodLicenseNumber?: string | null;
  buyerVerificationStatus?: string | null;
};

export function getMyProfile() {
  return request<UserProfile>('/profile');
}

export function updateMyProfile(payload: {
  photo?: string | null;
  bio?: string | null;
  businessName?: string | null;
  goldbodLicenseNumber?: string | null;
}) {
  return put<UserProfile>('/profile', payload);
}

export function getWorkerProfileByEmail(email: string) {
  return request<UserProfile>(`/profile/${encodeURIComponent(email)}`);
}

// Worker-to-supervisor messaging
export function sendWorkerMessage(content: string) {
  return post<WorkerMessage>('/worker-messages', { content });
}

export function getMyWorkerMessages() {
  return request<WorkerMessage[]>('/worker-messages/mine');
}

export function getSiteWorkerMessages() {
  return request<WorkerMessage[]>('/worker-messages/site');
}

export function replyToWorkerMessage(id: number, reply: string) {
  return post<WorkerMessage>(`/worker-messages/${id}/reply`, { reply });
}

export function markWorkerMessageRead(id: number) {
  return post<WorkerMessage>(`/worker-messages/${id}/read`, {});
}

// Supervisor dashboard
export type SupervisorDashboard = {
  hazardCount: number;
  noticeCount: number;
  workersOnSite: number;
  pendingShiftLogs: number;
  unreadMessages: number;
  certExpired: number;
  certExpiringSoon: number;
  announcements: { id: number; content: string; createdByName: string; createdAt: string }[];
  activeLoneWorkers: { id: number; workerName: string; intervalMinutes: number; lastCheckedInAt: string; deadline: string; alerted: boolean }[];
  safetyScore: number;
  safetyRecommendationCount: number;
  pendingBuyerVerifications: number;
  pendingMarketplaceOffers: number;
  openDisputes: number;
};

export function getSupervisorDashboard() {
  return request<SupervisorDashboard>('/supervisor/dashboard');
}

export type MultiSiteDashboardEntry = { site: string; isHome: boolean; summary: SupervisorDashboard };

export function getMultiSiteDashboard() {
  return request<MultiSiteDashboardEntry[]>('/supervisor/multi-site-dashboard');
}

// Shift announcements
export function getSiteAnnouncements() {
  return request<ShiftAnnouncement[]>('/announcements');
}

export function postAnnouncement(content: string) {
  return post<ShiftAnnouncement>('/announcements', { content });
}

// Lone worker
export type LoneWorkerStatus = {
  active: boolean;
  id?: number;
  workerName?: string;
  intervalMinutes?: number;
  startedAt?: string;
  lastCheckedInAt?: string;
  deadline?: string;
  alerted?: boolean;
};

export function getLoneWorkerStatus() {
  return request<LoneWorkerStatus>('/lone-worker/status');
}

export function startLoneWorker(intervalMinutes: number) {
  return post<LoneWorkerStatus>('/lone-worker/start', { intervalMinutes });
}

export function checkInLoneWorker() {
  return post<LoneWorkerStatus>('/lone-worker/checkin', {});
}

export function stopLoneWorker() {
  return post<LoneWorkerStatus>('/lone-worker/stop', {});
}

export function getSiteLoneWorkers() {
  return request<LoneWorkerStatus[]>('/lone-worker/site');
}

// Worker pay
export type WorkerPayRecord = {
  id: number;
  payCycleId: number;
  workerEmail: string;
  workerName: string;
  hoursWorked: number | null;
  grossShare: number;
  insuranceDeduction: number;
  netPay: number;
  momoNumber: string | null;
  momoNetwork: string | null;
  disbursementStatus: string; // PENDING | SENT | FAILED
  momoTransactionRef: string | null;
  failureReason: string | null;
  disbursedAt: string | null;
};

export type PayCycle = {
  id: number;
  site: string;
  periodStart: string;
  periodEnd: string;
  mineralType: string;
  unit: string;
  totalVolume: number;
  pricePerUnit: number;
  grossTotal: number;
  formulaType: string;
  status: string; // DRAFT | MANAGER_APPROVED | DISBURSED | FAILED
  createdBy: string;
  createdAt: string;
  managerApprovedBy: string | null;
  managerApprovedAt: string | null;
  supervisorApprovedBy: string | null;
  supervisorApprovedAt: string | null;
};

export type PayCycleDetail = { cycle: PayCycle; records: WorkerPayRecord[] };

export type PaySplitConfig = {
  id: number | null;
  site: string;
  formulaType: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export function previewPayCycle(payload: {
  periodStart: string;
  periodEnd: string;
  mineralType: string;
  unit: string;
  pricePerUnit: number;
}) {
  return post<PayCycleDetail>('/pay/preview', payload);
}

export function getMarketPrices() {
  return request<any[]>('/market/prices');
}

export function approvePayCycleManager(id: number) {
  return post<PayCycleDetail>(`/pay/${id}/approve-manager`, {});
}

export function approvePayCycleSupervisor(id: number) {
  return post<PayCycleDetail>(`/pay/${id}/approve-supervisor`, {});
}

export function getMyPayHistory() {
  return request<WorkerPayRecord[]>('/pay/mine');
}

export function getSitePayCycles() {
  return request<PayCycle[]>('/pay/site');
}

export function getPayCycle(id: number) {
  return request<PayCycleDetail>(`/pay/${id}`);
}

export function getPaySplitConfig() {
  return request<PaySplitConfig>('/pay/split-config');
}

export function updatePaySplitConfig(formulaType: string) {
  return put<PaySplitConfig>('/pay/split-config', { formulaType });
}

export function updateMyMomoDetails(momoNumber: string | null, momoNetwork: string | null) {
  return put<UserProfile>('/profile', { momoNumber, momoNetwork });
}

// ── Guest access codes ────────────────────────────────────────────────────────

export type GuestAccessCode = {
  id: number;
  site: string;
  guestSubRole: string;
  code: string;
  sessionHours: number;
  maxRedemptions: number;
  redemptionCount: number;
  active: boolean;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
};

export type GuestRosterEntry = {
  id: number;
  fullName: string;
  phone: string;
  joinedAt: string;
  inductionCompleted: boolean;
  sessionExpired: boolean;
};

export function redeemGuestCode(code: string, fullName: string, phone: string) {
  return post<{ token: string; refreshToken: string; user: any }>('/guest/redeem', { code, fullName, phone });
}

export function createGuestCode(payload: {
  guestSubRole: string;
  sessionHours: number;
  maxRedemptions: number;
  expiresAt: string;
}) {
  return post<GuestAccessCode>('/admin/guest-codes', payload);
}

export function getGuestCodes() {
  return request<GuestAccessCode[]>('/admin/guest-codes');
}

export function revokeGuestCode(id: number) {
  return post<GuestAccessCode>(`/admin/guest-codes/${id}/revoke`, {});
}

export function getGuestCodeRoster(id: number) {
  return request<GuestRosterEntry[]>(`/admin/guest-codes/${id}/roster`);
}

// ── Site map ──────────────────────────────────────────────────────────────────

export type MapPoint = { x: number; y: number };

export type SiteMapData = {
  id: number;
  site: string;
  imageData: string;
  uploadedBy: string;
  uploadedAt: string;
};

export type ZoneDetail = {
  zone: import('../types/actions').DangerZone;
  openHazards: import('../types/actions').HazardReport[];
  scheduledBlasts: any[];
};

export function getSiteMap() {
  return request<SiteMapData>('/site-map');
}

export function uploadSiteMap(imageData: string) {
  return post<SiteMapData>('/site-map', { imageData });
}

export function updateZonePosition(id: number, points: MapPoint[]) {
  return patch<import('../types/actions').DangerZone>(`/danger-zones/${id}/position`, { points });
}

export function getZoneDetail(id: number) {
  return request<ZoneDetail>(`/danger-zones/${id}/detail`);
}

// ── Buyer visibility ──────────────────────────────────────────────────────────

export function getPublicInventory() {
  return request<MineralInventory[]>('/inventory/public');
}

export function updateInventoryVisibility(visible: boolean) {
  return patch<Site>('/sites/visibility', { visible });
}

// ── Worker insurance ──────────────────────────────────────────────────────────

export type InsuranceStatus = {
  status: 'NOT_INSURED' | 'INSURED' | 'NOT_AVAILABLE';
  enrolledAt?: string | null;
};

export function getInsuranceStatus() {
  return request<InsuranceStatus>('/insurance/status');
}

export function applyForInsurance() {
  return post<InsuranceStatus>('/insurance/apply', {});
}

export function updateInsuranceConfig(payload: {
  insuranceEnabled?: boolean;
  insuranceProviderName?: string;
  insurancePremium?: number | null;
  insuranceDeductionMode?: 'DEDUCT_FROM_PAY' | 'BILL_TO_MINE';
}) {
  return patch<Site>('/sites/insurance-config', payload);
}
// ── Marketplace ───────────────────────────────────────────────────────────────

export type MineralListing = {
  id: number;
  site: string;
  mineralType: string;
  quantity: number;
  unit: string;
  grade: string | null;
  askingPrice: number;
  location: string | null;
  availableFrom: string | null;
  minOrderQuantity: number | null;
  photoData: string | null;
  status: string;
  createdBy: string;
  createdAt: string;
};

export type MarketplaceOffer = {
  id: number;
  listingId: number;
  parentOfferId: number | null;
  buyerEmail: string;
  buyerName: string;
  offerPrice: number;
  offerQuantity: number;
  message: string | null;
  status: string;
  createdAt: string;
  respondedAt: string | null;
  respondedBy: string | null;
};

export type MarketplaceTransaction = {
  id: number;
  listingId: number;
  offerId: number;
  site: string;
  buyerEmail: string;
  buyerName: string;
  mineralType: string;
  quantity: number;
  agreedPrice: number;
  batchStatus: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type PendingBuyer = {
  id: number;
  fullName: string;
  email: string;
  businessName: string | null;
  goldbodLicenseNumber: string | null;
  createdAt: string | null;
};

// Listings
export function getMarketplaceListings() {
  return request<MineralListing[]>('/marketplace/listings');
}
export function createListing(payload: {
  mineralType: string;
  quantity: number;
  unit: string;
  grade?: string | null;
  askingPrice: number;
  location?: string | null;
  availableFrom?: string | null;
  minOrderQuantity?: number | null;
  photoData?: string | null;
}) {
  return post<MineralListing>('/marketplace/listings', payload);
}
export function withdrawListing(id: number) {
  return patch<MineralListing>(`/marketplace/listings/${id}/withdraw`, {});
}

// Offers
export function createOffer(listingId: number, payload: { offerPrice: number; offerQuantity: number; message?: string | null }) {
  return post<MarketplaceOffer>(`/marketplace/listings/${listingId}/offers`, payload);
}
export function getMyOffers() {
  return request<MarketplaceOffer[]>('/marketplace/offers/mine');
}
export function getListingOffers(listingId: number) {
  return request<MarketplaceOffer[]>(`/marketplace/listings/${listingId}/offers`);
}
export function counterOffer(offerId: number, payload: { offerPrice: number; offerQuantity: number; message?: string | null }) {
  return post<MarketplaceOffer>(`/marketplace/offers/${offerId}/counter`, payload);
}
export function acceptOffer(offerId: number) {
  return post<MarketplaceTransaction>(`/marketplace/offers/${offerId}/accept`, {});
}
export function rejectOffer(offerId: number) {
  return post<MarketplaceOffer>(`/marketplace/offers/${offerId}/reject`, {});
}
export function withdrawOffer(offerId: number) {
  return post<MarketplaceOffer>(`/marketplace/offers/${offerId}/withdraw`, {});
}

// Transactions
export function getMyTransactions() {
  return request<MarketplaceTransaction[]>('/marketplace/transactions/mine');
}
export function getSiteTransactions() {
  return request<MarketplaceTransaction[]>('/marketplace/transactions/site');
}
export function updateTransactionStatus(id: number, batchStatus: string) {
  return patch<MarketplaceTransaction>(`/marketplace/transactions/${id}/status`, { batchStatus });
}

// Buyer verification (supervisor admin)
export function getPendingBuyers() {
  return request<PendingBuyer[]>('/admin/buyers/pending');
}
export function approveBuyer(email: string) {
  return post<{ email: string; approved: boolean }>('/admin/buyers/approve', { email });
}
export function rejectBuyer(email: string) {
  return post<{ email: string; rejected: boolean }>('/admin/buyers/reject', { email });
}

// Safety Intelligence
export type SafetyIntelligenceSummary = {
  hotspots: Array<{
    location: string;
    hazardCount: number;
    incidentCount: number;
    totalCount: number;
    mostRecentSeverity: string;
    mostRecentAt: string | null;
  }>;
  trends: Array<{
    hazardType: string;
    currentCount: number;
    priorCount: number;
    trend: 'NEW' | 'RISING' | 'STABLE';
  }>;
  recommendations: string[];
};

export function getSafetyIntelligenceSummary() {
  return request<SafetyIntelligenceSummary>('/safety-intelligence/summary');
}

// ── Community ─────────────────────────────────────────────────────────────────

export type MineProfile = {
  name: string;
  mineralsProduced: string;
  productionCapacity: string;
  establishedYear: number;
  profileDescription: string;
  contactEmail: string;
  safetyScore: number;
};

export type BuyerProfile = {
  fullName: string;
  email: string;
  companyName: string;
  buyerVerificationStatus: string;
};

export type ForumPost = {
  id: number;
  category: string;
  subforum: string;
  authorEmail: string;
  authorName: string;
  authorRole: string;
  title: string;
  body: string;
  replyCount: number;
  createdAt: string;
};

export type ForumReply = {
  id: number;
  postId: number;
  authorEmail: string;
  authorName: string;
  authorRole: string;
  body: string;
  createdAt: string;
};

export type CommunityEvent = {
  id: number;
  title: string;
  description: string;
  eventType: string;
  eventDate: string;
  createdByEmail: string;
  createdByName: string;
  createdAt: string;
};

export type JobPosting = {
  id: number;
  site: string;
  title: string;
  description: string;
  postedByEmail: string;
  postedByName: string;
  status: string;
  createdAt: string;
};

export type JobInterest = {
  id: number;
  jobPostingId: number;
  applicantEmail: string;
  applicantName: string;
  applicantRole: string;
  message: string;
  createdAt: string;
};

export type MarketplaceRating = {
  id: number;
  transactionId: number;
  raterEmail: string;
  raterRole: string;
  reliability: number;
  communication: number;
  productQuality: number | null;
  listingAccuracy: number | null;
  comment: string | null;
  createdAt: string;
};

export type TransactionDispute = {
  id: number;
  transactionId: number;
  raisedByEmail: string;
  raisedByRole: string;
  reason: string;
  status: string;
  resolutionNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

// Directory
export function getMines() {
  return request<MineProfile[]>('/community/mines');
}
export function getMine(siteName: string) {
  return request<MineProfile>(`/community/mines/${encodeURIComponent(siteName)}`);
}
export function getVerifiedBuyers() {
  return request<BuyerProfile[]>('/community/buyers');
}
export function updateMineProfile(payload: Partial<Omit<MineProfile, 'name' | 'safetyScore'>>) {
  return patch<MineProfile>('/community/mine-profile', payload);
}

// Forum
export function getForumPosts(subforum?: string, category?: string) {
  const params = new URLSearchParams();
  if (subforum) params.set('subforum', subforum);
  if (category) params.set('category', category);
  const qs = params.toString();
  return request<ForumPost[]>(`/forum/posts${qs ? '?' + qs : ''}`);
}
export function createForumPost(payload: { title: string; body: string; subforum?: string; category?: string }) {
  return post<ForumPost>('/forum/posts', payload);
}
export function getPostReplies(postId: number) {
  return request<ForumReply[]>(`/forum/posts/${postId}/replies`);
}
export function createReply(postId: number, body: string) {
  return post<ForumReply>(`/forum/posts/${postId}/replies`, { body });
}

// Events
export function getCommunityEvents() {
  return request<CommunityEvent[]>('/community/events');
}
export function createCommunityEvent(payload: { title: string; description?: string; eventType?: string; eventDate: string }) {
  return post<CommunityEvent>('/community/events', payload);
}

// Job board
export function getJobPostings() {
  return request<JobPosting[]>('/community/jobs');
}
export function createJobPosting(payload: { title: string; description?: string }) {
  return post<JobPosting>('/community/jobs', payload);
}
export function closeJobPosting(id: number) {
  return patch<JobPosting>(`/community/jobs/${id}/close`, {});
}
export function expressJobInterest(id: number, message?: string) {
  return post<JobInterest>(`/community/jobs/${id}/interest`, { message: message ?? '' });
}
export function getJobInterest(id: number) {
  return request<JobInterest[]>(`/community/jobs/${id}/interest`);
}

// Ratings
export function submitRating(transactionId: number, payload: {
  reliability: number;
  communication: number;
  productQuality?: number;
  listingAccuracy?: number;
  comment?: string;
}) {
  return post<MarketplaceRating>(`/community/transactions/${transactionId}/ratings`, payload);
}
export function getMineRatings(siteName: string) {
  return request<MarketplaceRating[]>(`/community/mines/${encodeURIComponent(siteName)}/ratings`);
}
export function getBuyerRatings(email: string) {
  return request<MarketplaceRating[]>(`/community/buyers/${encodeURIComponent(email)}/ratings`);
}

// Disputes
export function raiseDispute(transactionId: number, reason: string) {
  return post<TransactionDispute>(`/community/transactions/${transactionId}/dispute`, { reason });
}
export function getDispute(transactionId: number) {
  return request<TransactionDispute>(`/community/transactions/${transactionId}/dispute`);
}
export function resolveDispute(disputeId: number, resolutionNotes: string) {
  return patch<TransactionDispute>(`/community/disputes/${disputeId}/resolve`, { resolutionNotes });
}

// Notifications
export type AppNotification = {
  id: number;
  type: string;
  title: string;
  body: string;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  readAt: string | null;
  createdAt: string;
};

export function getNotifications(page: number) {
  return request<{ content: AppNotification[]; totalElements: number; last: boolean }>(
    `/notifications?page=${page}&size=20&sort=createdAt,desc`
  );
}
export function getUnreadNotificationCount() {
  return request<{ count: number }>('/notifications/unread-count');
}
export function markNotificationRead(id: number) {
  return patch<AppNotification>(`/notifications/${id}/read`, {});
}
export function markAllNotificationsRead() {
  return patch<void>('/notifications/read-all', {});
}

// Search
export type SearchResults = {
  hazards: { id: number; hazardType: string; location: string; severity: string; status: string; createdAt: string }[];
  incidents: { id: number; category: string; severity: string; zone: string; description: string; status: string; reportedAt: string }[];
  workers: { id: number; fullName: string; email: string; role: string }[];
  listings: { id: number; mineralType: string; location: string; quantity: number; unit: string; askingPrice: number; site: string }[];
  forumPosts: { id: number; title: string; body: string; authorName: string; createdAt: string }[];
};
export function search(q: string) {
  return request<SearchResults>(`/search?q=${encodeURIComponent(q)}`);
}

// CSV exports
export function exportHazardsCsv() {
  return requestText('/hazards/export/csv');
}
export function exportIncidentsCsv() {
  return requestText('/incidents/export/csv');
}
export function exportPayCycleCsv(cycleId: number) {
  return requestText(`/pay/${cycleId}/export/csv`);
}
export function exportShiftLogsCsv() {
  return requestText('/shift-logs/export/csv');
}
export function exportTransactionsCsv() {
  return requestText('/marketplace/transactions/export/csv');
}

// Government dashboard
export type MiningPermitStatus = {
  id: number | null;
  site: string;
  applicationSubmitted: boolean;
  communityNotificationDone: boolean;
  ministerialReviewStatus: string | null;
  epaPermitObtained: boolean;
  updatedByEmail: string | null;
  updatedAt: string | null;
};

export type BulkPurchaseRequest = {
  id: number;
  site: string;
  mineralType: string;
  quantityAvailable: number;
  unit: string;
  status: string;
  flaggedByEmail: string;
  createdAt: string;
};

export type IllegalMineReport = {
  id: number;
  reporterEmail: string;
  reporterRole: string;
  locationDescription: string;
  details: string | null;
  status: string;
  reviewedByEmail: string | null;
  reviewNotes: string | null;
  createdAt: string;
  photoData: string | null;
  latitude: number | null;
  longitude: number | null;
};

// Government-role endpoints
export function getGovernmentInventory() {
  return request<MineralInventory[]>('/government/inventory');
}
export function getGovernmentBulkPurchaseRequests() {
  return request<BulkPurchaseRequest[]>('/government/bulk-purchase-requests');
}
export function fulfillBulkPurchaseRequest(id: number) {
  return patch<BulkPurchaseRequest>(`/government/bulk-purchase-requests/${id}/fulfill`, {});
}
export function getGovernmentIllegalMineReports() {
  return request<IllegalMineReport[]>('/government/illegal-mine-reports');
}
export function reviewIllegalMineReport(id: number, payload: { status: string; reviewNotes?: string }) {
  return patch<IllegalMineReport>(`/government/illegal-mine-reports/${id}/review`, payload);
}
export function getGovernmentPermits() {
  return request<MiningPermitStatus[]>('/government/permits');
}

// Supervisor permit status
export function getMyPermitStatus() {
  return request<MiningPermitStatus>('/permits/mine');
}
export function updatePermitStatus(payload: Partial<{
  applicationSubmitted: boolean;
  communityNotificationDone: boolean;
  ministerialReviewStatus: string;
  epaPermitObtained: boolean;
}>) {
  return patch<MiningPermitStatus>('/permits/mine', payload);
}

// Supervisor bulk purchase flagging
export function getSiteBulkPurchaseRequests() {
  return request<BulkPurchaseRequest[]>('/bulk-purchase-requests');
}
export function flagForBulkPurchase(payload: { mineralType: string; quantityAvailable: number; unit: string }) {
  return post<BulkPurchaseRequest>('/bulk-purchase-requests', payload);
}
export function withdrawBulkPurchaseRequest(id: number) {
  return del<void>(`/bulk-purchase-requests/${id}`);
}

// Illegal mine report (any non-guest role)
export function submitIllegalMineReport(payload: {
  locationDescription: string;
  details?: string;
  photoData?: string;
  latitude?: number;
  longitude?: number;
  clientRequestId?: string;
}) {
  return post<IllegalMineReport>('/illegal-mine-reports', payload);
}

// Multi-site access
export type SiteAccess = {
  id: number | null;
  site: string;
  isCurrent: boolean;
  isHome: boolean;
  grantedByEmail: string | null;
  grantedAt: string | null;
};
export function getMySites() {
  return request<SiteAccess[]>('/my-sites');
}
export function switchSite(site: string) {
  return post<void>('/my-sites/switch', { site });
}
export function grantSiteAccess(supervisorEmail: string, site: string) {
  return post<SiteAccess>('/my-sites/grant', { supervisorEmail, site });
}
export function revokeSiteAccess(id: number) {
  return del<void>(`/my-sites/grant/${id}`);
}

export type SubscriptionTier = {
  id: number;
  name: string;
  monthlyPriceGhs: number;
  description: string | null;
  active: boolean;
};

export type SiteSubscription = {
  id: number | null;
  site: string;
  tierId: number | null;
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  createdAt: string | null;
};

export type SubscriptionPaymentResult = {
  subscription: SiteSubscription;
  payment: {
    id: number;
    amountGhs: number;
    method: string | null;
    reference: string | null;
    createdAt: string;
  };
};

export function getSubscriptionTiers() {
  return request<SubscriptionTier[]>('/subscriptions/tiers');
}

export function getMySiteSubscription() {
  return request<SiteSubscription>('/subscriptions/mine');
}

export function recordSubscriptionPayment(payload: {
  amountGhs: string;
  method: string;
  reference?: string;
  periodCoveredStart?: string;
  periodCoveredEnd: string;
  tierId?: number;
}) {
  return post<SubscriptionPaymentResult>('/subscriptions/mine/record-payment', payload);
}
