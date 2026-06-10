import type { UserRole } from './role';

export type HazardReport = {
  id: number;
  reportedByRole: UserRole | string;
  site: string;
  description: string;
  status: string;
  createdAt: string;
};

export type SupervisorMessage = {
  id: number;
  senderRole: UserRole | string;
  audience: string;
  message: string;
  createdAt: string;
};

export type DangerZone = {
  id: number;
  site: string;
  zoneName: string;
  riskLevel: string;
  status: string;
  createdAt: string;
};

export type VisitorInduction = {
  id: number;
  visitorType: string;
  site: string;
  status: string;
  completedAt: string;
};
