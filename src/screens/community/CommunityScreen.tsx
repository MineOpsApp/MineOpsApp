import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import DirectoryScreen from './DirectoryScreen';
import ForumScreen from './ForumScreen';
import EventsScreen from './EventsScreen';
import JobBoardScreen from './JobBoardScreen';

type CommunityTab = 'directory' | 'forum' | 'events' | 'jobs';

const TABS: { key: CommunityTab; label: string }[] = [
  { key: 'directory', label: 'Directory' },
  { key: 'forum', label: 'Forum' },
  { key: 'events', label: 'Events' },
  { key: 'jobs', label: 'Jobs' },
];

export default function CommunityScreen({
  isSupervisor = false,
  userEmail = '',
}: {
  isSupervisor?: boolean;
  userEmail?: string;
}) {
  const [tab, setTab] = useState<CommunityTab>('directory');

  function renderTab() {
    switch (tab) {
      case 'directory': return <DirectoryScreen />;
      case 'forum': return <ForumScreen />;
      case 'events': return <EventsScreen canCreate={isSupervisor} />;
      case 'jobs': return <JobBoardScreen isSupervisor={isSupervisor} userEmail={userEmail} />;
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabItem, tab === t.key && styles.tabItemActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={{ flex: 1 }}>{renderTab()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { backgroundColor: '#1e293b', padding: 16, paddingTop: 48 },
  headerTitle: { color: '#f8fafc', fontSize: 22, fontWeight: '700' },
  tabBar: { backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155', maxHeight: 48 },
  tabItem: { paddingHorizontal: 18, paddingVertical: 12 },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: '#f59e0b' },
  tabLabel: { color: '#94a3b8', fontWeight: '600', fontSize: 14 },
  tabLabelActive: { color: '#f59e0b' },
});
