import type { DashboardData } from '../types/dashboard';
import type { Site } from '../types/site';

const API_BASE_URL = 'http://192.168.0.101:8080/api';

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);

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
