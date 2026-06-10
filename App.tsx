import { useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type TabName = 'dashboard' | 'sites';

type AlertItem = {
  title: string;
  level: string;
};

type ActivityItem = {
  title: string;
  time: string;
};

type DashboardData = {
  siteCount: number;
  equipmentCount: number;
  activeEquipment: number;
  openInspections: number;
  overdueMaintenance: number;
  alerts: AlertItem[];
  recentActivity: ActivityItem[];
};

type Site = {
  name: string;
  status: string;
};

const API_BASE_URL = 'http://192.168.0.101:8080/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [dashboardMessage, setDashboardMessage] = useState('Loading dashboard...');
  const [sitesMessage, setSitesMessage] = useState('Loading sites...');
  const [refreshing, setRefreshing] = useState(false);

  async function loadDashboard() {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard`);

      if (!response.ok) {
        throw new Error('Backend request failed');
      }

      const data: DashboardData = await response.json();

      setDashboard(data);
      setDashboardMessage('');
    } catch (error) {
      setDashboardMessage('Could not connect to backend');
    }
  }

  async function loadSites() {
    try {
      const response = await fetch(`${API_BASE_URL}/sites`);

      if (!response.ok) {
        throw new Error('Backend request failed');
      }

      const data: Site[] = await response.json();

      setSites(data);
      setSitesMessage('');
    } catch (error) {
      setSitesMessage('Could not connect to backend');
    }
  }

  useEffect(() => {
    loadDashboard();
    loadSites();
  }, []);

  async function refreshCurrentTab() {
    setRefreshing(true);

    if (activeTab === 'dashboard') {
      await loadDashboard();
    } else {
      await loadSites();
    }

    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appHeader}>
        <Text style={styles.brand}>MineOps</Text>
        <View style={styles.tabs}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'dashboard' }}
            onPress={() => setActiveTab('dashboard')}
            style={[styles.tab, activeTab === 'dashboard' && styles.activeTab]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'dashboard' && styles.activeTabText,
              ]}
            >
              Dashboard
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'sites' }}
            onPress={() => setActiveTab('sites')}
            style={[styles.tab, activeTab === 'sites' && styles.activeTab]}
          >
            <Text
              style={[styles.tabText, activeTab === 'sites' && styles.activeTabText]}
            >
              Sites
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshCurrentTab} />
        }
      >
        {activeTab === 'dashboard' ? (
          <DashboardScreen dashboard={dashboard} message={dashboardMessage} />
        ) : (
          <SitesScreen sites={sites} message={sitesMessage} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DashboardScreen({
  dashboard,
  message,
}: {
  dashboard: DashboardData | null;
  message: string;
}) {
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
        <Text style={styles.subtitle}>Live site, equipment, and inspection overview</Text>
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

function SitesScreen({ sites, message }: { sites: Site[]; message: string }) {
  return (
    <>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Network</Text>
        <Text style={styles.title}>Sites</Text>
        <Text style={styles.subtitle}>Mining locations currently tracked in MineOps</Text>
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {sites.map((site) => (
        <View key={site.name} style={styles.siteCard}>
          <View style={styles.siteInfo}>
            <Text style={styles.siteName}>{site.name}</Text>
            <Text style={styles.siteMeta}>Operational site</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{site.status}</Text>
          </View>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  appHeader: {
    backgroundColor: '#ffffff',
    borderBottomColor: '#dde3ea',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  brand: {
    color: '#17212b',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
  tabs: {
    backgroundColor: '#edf1f5',
    borderRadius: 8,
    flexDirection: 'row',
    padding: 4,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: '#ffffff',
  },
  tabText: {
    color: '#5d6875',
    fontSize: 14,
    fontWeight: '800',
  },
  activeTabText: {
    color: '#1f6f5b',
  },
  container: {
    padding: 20,
    paddingBottom: 36,
  },
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
  siteCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#dde3ea',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    minHeight: 78,
    padding: 14,
  },
  siteInfo: {
    flex: 1,
    paddingRight: 12,
  },
  siteName: {
    color: '#17212b',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
  siteMeta: {
    color: '#5d6875',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: '#e7f6ef',
    borderRadius: 8,
    minWidth: 88,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statusBadgeText: {
    color: '#1f7a4d',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
});
