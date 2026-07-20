import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';
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
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

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

function makeStyles(theme: Theme, _isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: { backgroundColor: theme.bg, padding: spacing.lg, paddingTop: 48 },
    headerTitle: { color: theme.text, fontSize: 22, fontWeight: '700' },
    tabBar: { backgroundColor: theme.bg, borderBottomColor: theme.border, borderBottomWidth: 1, maxHeight: 48 },
    tabItem: { paddingHorizontal: 18, paddingVertical: spacing.md },
    tabItemActive: { borderBottomColor: theme.accent, borderBottomWidth: 2 },
    tabLabel: { color: theme.textSub, fontWeight: '600', fontSize: 14 },
    tabLabelActive: { color: theme.accent },
  });
}
