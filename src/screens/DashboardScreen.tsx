import { StyleSheet, Text, View } from 'react-native';

import type { DashboardData } from '../types/dashboard';

type DashboardScreenProps = {
  dashboard: DashboardData | null;
  message: string;
};

export function DashboardScreen({ dashboard, message }: DashboardScreenProps) {
  const stats = dashboard
    ? [
        { label: 'Sites', value: dashboard.siteCount, tone: styles.toneBlue },
        { label: 'Equipment', value: dashboard.equipmentCount, tone: styles.toneSlate },
        { label: 'Active Units', value: dashboard.activeEquipment, tone: styles.toneGreen },
        { label: 'Open Checks', value: dashboard.openInspections, tone: styles.toneAmber },
        { label: 'Overdue', value: dashboard.overdueMaintenance, tone: styles.toneRed },
      ]
    : [];

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Operations</Text>
        <Text style={styles.title}>Dashboard</Text>
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {dashboard ? (
        <>
          <View style={styles.statsGrid}>
            {stats.map((stat) => (
              <View key={stat.label} style={styles.statCard}>
                <Text style={[styles.statValue, stat.tone]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Priority Alerts</Text>
            {dashboard.alerts.map((alert) => (
              <View key={alert.title} style={styles.listItem}>
                <View style={styles.listText}>
                  <Text style={styles.itemTitle}>{alert.title}</Text>
                  <Text style={styles.itemMeta}>{alert.level}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {dashboard.recentActivity.map((activity) => (
              <View key={activity.title} style={styles.listItem}>
                <View style={styles.listText}>
                  <Text style={styles.itemTitle}>{activity.title}</Text>
                  <Text style={styles.itemMeta}>{activity.time}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  eyebrow: {
    color: '#1f6f5b',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: '#17212b',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 6,
  },
  subtitle: {
    color: '#5d6875',
    fontSize: 16,
    lineHeight: 22,
    marginTop: 8,
  },
  message: {
    color: '#5d6875',
    fontSize: 16,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 22,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dde3ea',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 92,
    padding: 14,
    width: '48%',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  statLabel: {
    color: '#5d6875',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  toneBlue: {
    color: '#1d5f99',
  },
  toneSlate: {
    color: '#334155',
  },
  toneGreen: {
    color: '#1f7a4d',
  },
  toneAmber: {
    color: '#a15c00',
  },
  toneRed: {
    color: '#b42318',
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    color: '#17212b',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  listItem: {
    backgroundColor: '#ffffff',
    borderColor: '#dde3ea',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  listText: {
    gap: 4,
  },
  itemTitle: {
    color: '#17212b',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  itemMeta: {
    color: '#5d6875',
    fontSize: 14,
    fontWeight: '600',
  },
});
