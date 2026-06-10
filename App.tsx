import { useEffect, useState } from 'react';
import { RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppTabs, type TabName } from './src/components/AppTabs';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { SitesScreen } from './src/screens/SitesScreen';
import { getDashboard, getSites } from './src/services/api';
import type { DashboardData } from './src/types/dashboard';
import type { Site } from './src/types/site';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [dashboardMessage, setDashboardMessage] = useState('Loading dashboard...');
  const [sitesMessage, setSitesMessage] = useState('Loading sites...');
  const [refreshing, setRefreshing] = useState(false);

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
        <AppTabs activeTab={activeTab} onTabChange={setActiveTab} />
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
  container: {
    padding: 20,
    paddingBottom: 36,
  },
});
