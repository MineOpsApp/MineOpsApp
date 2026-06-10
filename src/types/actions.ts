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

export type NoticeSeen = {
  id: number;
  noticeId: number;
  fullName: string;
  email: string;
  role: UserRole | string;
  seenAt: string;
};

export type Notice = {
  id: number;
  title: string;
  message: string;
  postedByRole: UserRole | string;
  createdAt: string;
  seenBy: NoticeSeen[];
};
