export type AlertItem = {
  title: string;
  level: string;
};

export type ActivityItem = {
  title: string;
  time: string;
};

export type DashboardData = {
  siteCount: number;
  equipmentCount: number;
  activeEquipment: number;
  openInspections: number;
  overdueMaintenance: number;
  alerts: AlertItem[];
  recentActivity: ActivityItem[];
};
