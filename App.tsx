import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppTabs, type TabName } from './src/components/AppTabs';
import { SosButton } from './src/components/SosButton';
import { AuthScreen } from './src/screens/AuthScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { RolesScreen } from './src/screens/RolesScreen';
import { SitesScreen } from './src/screens/SitesScreen';
import { getDashboard, getSites } from './src/services/api';
import type { DashboardData } from './src/types/dashboard';
import type { UserRole } from './src/types/role';
import type { Site } from './src/types/site';
import type { AuthSession } from './src/types/auth';

const tabsByRole: Record<UserRole, { label: string; value: TabName }[]> = {
  worker: [
    { label: 'Today', value: 'dashboard' },
    { label: 'Site', value: 'sites' },
    { label: 'Work', value: 'roles' },
  ],
  supervisor: [
    { label: 'Ops', value: 'dashboard' },
    { label: 'Sites', value: 'sites' },
    { label: 'Team', value: 'roles' },
  ],
  safetyOfficer: [
    { label: 'Safety', value: 'dashboard' },
    { label: 'Zones', value: 'sites' },
    { label: 'Audit', value: 'roles' },
  ],
  guest: [
    { label: 'Visit', value: 'dashboard' },
    { label: 'Map', value: 'sites' },
    { label: 'Guide', value: 'roles' },
  ],
};

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [dashboardMessage, setDashboardMessage] = useState('Loading dashboard...');
  const [sitesMessage, setSitesMessage] = useState('Loading sites...');
  const [refreshing, setRefreshing] = useState(false);
  const selectedRole = session?.user.role ?? 'guest';

  async function loadDashboard() {
    try {
      const data = await getDashboard();
      setDashboard(data);
      setDashboardMessage('');
    } catch (error) {
      setDashboardMessage('Could not connect to backend');
    }
  }

  async function loadSites() {
    try {
      const data = await getSites();
      setSites(data);
      setSitesMessage('');
    } catch (error) {
      setSitesMessage('Could not connect to backend');
    }
  }

  useEffect(() => {
    if (session) {
      loadDashboard();
      loadSites();
    }
  }, [session]);

  if (!session) {
    return <AuthScreen onAuthenticated={setSession} />;
  }

  async function refreshCurrentTab() {
    setRefreshing(true);

    if (activeTab === 'dashboard') {
      await loadDashboard();
    } else if (activeTab === 'sites') {
      await loadSites();
    }

    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appHeader}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.brand}>MineOps</Text>
            <Text style={styles.userLine}>
              {session.user.fullName} - {session.user.role}
            </Text>
          </View>
          <Pressable onPress={() => setSession(null)} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
        <AppTabs activeTab={activeTab} onTabChange={setActiveTab} tabs={tabsByRole[selectedRole]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshCurrentTab} />
        }
      >
        {activeTab === 'dashboard' ? (
          <DashboardScreen dashboard={dashboard} message={dashboardMessage} />
        ) : null}

        {activeTab === 'sites' ? (
          <SitesScreen sites={sites} message={sitesMessage} />
        ) : null}

        {activeTab === 'roles' ? (
          <RolesScreen
            allowRoleChange={false}
            selectedRole={selectedRole}
            onRoleChange={() => undefined}
          />
        ) : null}
      </ScrollView>

      <SosButton role={selectedRole} />
    </SafeAreaView>
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
  },
  headerTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userLine: {
    color: '#5d6875',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  logoutButton: {
    backgroundColor: '#edf1f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutText: {
    color: '#17212b',
    fontSize: 13,
    fontWeight: '900',
  },
  container: {
    padding: 20,
    paddingBottom: 36,
  },
});
