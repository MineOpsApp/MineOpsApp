import type { UserRole } from './role';

export type SosAlert = {
  id: number;
  role: UserRole | 'unknown';
  site: string;
  message: string;
  status: string;
  actorName: string | null;
  actorEmail: string | null;
  createdAt: string;
  latitude: number | null;
  longitude: number | null;
};

export type CreateSosAlertRequest = {
  role: UserRole;
  site: string;
  message: string;
  actorName: string;
  actorEmail: string;
  clientRequestId?: string;
  latitude?: number | null;
  longitude?: number | null;
};
