import type { UserRole } from './role';

export type HazardReport = {
  id: number;
  reportedByRole: UserRole | string;
  reportedByName: string;
  reportedByEmail: string;
  hazardType: string;
  site: string;
  location: string;
  description: string;
  severity?: string;  
  status: string;
  reviewedByRole?: UserRole | string;
  reviewedByName?: string;
  reviewedByEmail?: string;
  closedByRole?: UserRole | string;
  closedByName?: string;
  closedByEmail?: string;
  actionTaken?: string;
  createdAt: string;
  reviewedAt?: string;
  closedAt?: string;
  latitude?: number;
longitude?: number;
photoData?: string
};

export type AuditLog = {
  id: number;
  action: string;
  actorRole: UserRole | string;
  actorName: string;
  actorEmail: string;
  targetType: string;
  targetId: number | null;
  details: string;
  createdAt: string;
};

export type SupervisorMessage = {
  id: number;
  senderRole: UserRole | string;
  audience: string;
  message: string;
  createdAt: string;
};

export type ShiftAnnouncement = {
  id: number;
  site: string;
  content: string;
  createdByName: string;
  createdByEmail: string;
  createdAt: string;
};

export type WorkerMessage = {
  id: number;
  senderEmail: string;
  senderName: string;
  site: string;
  content: string;
  reply?: string | null;
  repliedAt?: string | null;
  readAt?: string | null;
  createdAt: string;
  recipientEmail?: string | null;
  recipientName?: string | null;
  initiatedBy?: string;
  repliedByEmail?: string | null;
  repliedByName?: string | null;
};

export type DangerZone = {
  id: number;
  site: string;
  zoneName: string;
  riskLevel: string;
  status: string;
  createdAt: string;
  polygonPoints?: string | null;
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
  category?: string;
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

export type EmergencyContact = {
  id: number;
  workerId: number;
  contactType: 'PRIMARY' | 'BACKUP';
  name: string;
  relationship: string;
  phone: string;
  createdAt: string;
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
