export type UserRole = 'worker' | 'supervisor' | 'safetyOfficer' | 'guest' | 'buyer';

export type RolePermission = {
  label: string;
  allowed: boolean;
};

export type RoleDefinition = {
  id: UserRole;
  label: string;
  summary: string;
  responsibilities: string[];
  auditLogAccess: boolean;
  permissions: RolePermission[];
};
