import type { UserRole } from './role';

export type AuthUser = {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  assignedSite?: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

export type AuthPayload = {
  fullName?: string;
  email: string;
  password: string;
  role?: UserRole;
  assignedSite?: string;
};
