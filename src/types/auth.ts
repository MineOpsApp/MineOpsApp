import type { UserRole } from './role';

export type AuthUser = {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  assignedSite?: string;
  guestSubRole?: string;
  goldbodLicenseNumber?: string | null;
};

export type AuthSession = {
  token: string;
  refreshToken: string;
  user: AuthUser;
};

export type AuthPayload = {
  fullName?: string;
  email: string;
  password: string;
  role?: UserRole;
  assignedSite?: string;
  guestSubRole?: string;
  businessName?: string;
  verificationDocument?: string;
  goldbodLicenseNumber?: string;
  acceptedTerms?: boolean;
};
