import type { RoleDefinition } from '../types/role';

export const roleDefinitions: RoleDefinition[] = [
  {
    id: 'worker',
    label: 'Worker',
    summary: 'Field user focused on assigned work, inspections, and reports.',
    permissions: [
      { label: 'View assigned site', allowed: true },
      { label: 'View assigned equipment', allowed: true },
      { label: 'Submit daily inspections', allowed: true },
      { label: 'Report hazards and incidents', allowed: true },
      { label: 'Approve inspections', allowed: false },
      { label: 'Manage users', allowed: false },
    ],
  },
  {
    id: 'supervisor',
    label: 'Supervisor',
    summary: 'Operations lead for site activity, workers, and shift oversight.',
    permissions: [
      { label: 'View assigned site dashboard', allowed: true },
      { label: 'Review worker inspections', allowed: true },
      { label: 'Approve or reject inspection reports', allowed: true },
      { label: 'Create daily shift reports', allowed: true },
      { label: 'Manage users', allowed: false },
      { label: 'Override safety decisions', allowed: false },
    ],
  },
  {
    id: 'safetyOfficer',
    label: 'Safety Officer',
    summary: 'Safety and compliance user for hazards, incidents, and observations.',
    permissions: [
      { label: 'View safety dashboard', allowed: true },
      { label: 'Review hazard reports', allowed: true },
      { label: 'Create safety observations', allowed: true },
      { label: 'Mark incidents as resolved', allowed: true },
      { label: 'Escalate serious safety issues', allowed: true },
      { label: 'Assign production tasks', allowed: false },
    ],
  },
  {
    id: 'guest',
    label: 'Guest',
    summary: 'Read-only visitor with limited access to non-sensitive information.',
    permissions: [
      { label: 'View basic dashboard summary', allowed: true },
      { label: 'View general site information', allowed: true },
      { label: 'View general equipment status', allowed: true },
      { label: 'Submit reports', allowed: false },
      { label: 'Edit records', allowed: false },
      { label: 'View worker personal data', allowed: false },
    ],
  },
];
