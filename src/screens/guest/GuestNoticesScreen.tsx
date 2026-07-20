import { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { getNotices, markNoticeSeen } from '../../services/api';
import type { Notice } from '../../types/actions';
import type { AuthSession } from '../../types/auth';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

export function GuestNoticesScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  function load() { getNotices().then(setNotices).catch(() => {}); }
  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function markSeen(notice: Notice) {
    try {
      const updated = await markNoticeSeen(notice.id, session.user);
      setNotices((c) => c.map((n) => n.id === updated.id ? updated : n));
    } catch { Alert.alert('Action failed', 'Could not mark notice as seen.'); }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Text style={styles.title}>Notices</Text>
      {notices.length === 0 ? (
        <View style={styles.card}><Text style={styles.meta}>No notices yet</Text></View>
      ) : null}
      {notices.map((n) => {
        const seen = n.seenBy.some((s) => s.email.toLowerCase() === session.user.email.toLowerCase());
        return (
          <View key={n.id} style={[styles.card, seen && styles.seenCard]}>
            <Text style={styles.cardTitle}>{n.title}</Text>
            <Text style={styles.meta}>{n.message}</Text>
            {!seen ? <ActionButton label="Mark as Seen" onPress={() => markSeen(n)} /> : (
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 4 }}>
                <Ionicons name="checkmark-circle" size={14} color={theme.accent} />
                <Text style={styles.seenLabel}>Seen</Text>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

function makeStyles(theme: Theme, isDark: boolean) {
  const cardShadow = {
    shadowColor: '#000' as const,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 4,
    elevation: 2,
  };
  return StyleSheet.create({
    container: { padding: spacing.xl, paddingBottom: 40, backgroundColor: theme.bg },
    title: { ...typography.h1, color: theme.text, marginBottom: spacing.lg },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14, ...cardShadow },
    seenCard: { borderColor: theme.accent, opacity: 0.8 },
    cardTitle: { color: theme.text, fontSize: 15, fontWeight: '800', marginBottom: 4 },
    meta: { color: theme.textSub, fontSize: 13, fontWeight: '600', marginBottom: spacing.sm },
    seenLabel: { color: theme.accent, fontSize: 13, fontWeight: '800' },
  });
}
