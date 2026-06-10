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

export type WorkerEquipment = {
  id: number;
  workerEmail: string;
  name: string;
  code: string;
  status: string;
  instructions: string;
};

export type EquipmentFault = {
  id: number;
  workerEmail: string;
  equipmentCode: string;
  description: string;
  status: string;
  createdAt: string;
};

export type MaintenanceRequest = {
  id: number;
  workerEmail: string;
  equipmentCode: string;
  requestDetails: string;
  status: string;
  createdAt: string;
};

export type WorkerRecord = {
  title: string;
  status?: string;
  date?: string;
};

export type WorkerProfile = {
  fullName: string;
  email: string;
  role: UserRole | string;
  assignedSite: string;
  assignedZone: string;
  assignedEquipment: WorkerEquipment[];
  submittedHazards: HazardReport[];
  equipmentFaults: EquipmentFault[];
  maintenanceRequests: MaintenanceRequest[];
  inspectionHistory: WorkerRecord[];
  trainingRecords: WorkerRecord[];
  shiftHistory: WorkerRecord[];
  incidentInvolvementHistory: WorkerRecord[];
};
