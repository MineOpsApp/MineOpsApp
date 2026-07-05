import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import {
  type AppNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/api';

const TYPE_ICONS: Record<string, string> = {
  HAZARD: '⚠️',
  INCIDENT: '🔴',
  BLAST: '💥',
  SOS: '🚨',
  NOTICE: '📢',
  SHIFT_LOG: '📋',
  MESSAGE: '💬',
  OFFER: '🤝',
  BUYER_VERIFICATION: '✅',
};

type Props = { onUnreadChange?: (count: number) => void };

export function NotificationsScreen({ onUnreadChange }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);

  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await getNotifications(0);
      setItems(res.content);
      onUnreadChange?.(res.content.filter(n => !n.readAt).length);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onUnreadChange]);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (id: number) => {
    try {
      const updated = await markNotificationRead(id);
      setItems(prev => prev.map(n => n.id === id ? updated : n));
      onUnreadChange?.(items.filter(n => !n.readAt && n.id !== id).length);
    } catch { /* best-effort */ }
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setItems(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      onUnreadChange?.(0);
    } catch { /* best-effort */ } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = items.filter(n => !n.readAt).length;
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.danger, marginBottom: 12 }}>{error}</Text>
        <Pressable onPress={() => load()} style={[styles.btn, { backgroundColor: theme.accent }]}>
          <Text style={styles.btnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {unreadCount > 0 && (
        <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
          <Text style={[styles.unreadLabel, { color: theme.textSub }]}>
            {unreadCount} unread
          </Text>
          <Pressable
            onPress={handleMarkAll}
            disabled={markingAll}
            style={[styles.markAllBtn, { backgroundColor: theme.accent }]}
          >
            <Text style={styles.markAllText}>{markingAll ? '…' : 'Mark all read'}</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={n => String(n.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.accent} />
        }
        contentContainerStyle={items.length === 0 ? styles.empty : styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ color: theme.textMuted, fontSize: 15 }}>No notifications yet</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isUnread = !item.readAt;
          return (
            <Pressable
              onPress={() => isUnread && handleMarkRead(item.id)}
              style={[
                styles.card,
                { backgroundColor: isUnread ? theme.accentLight : theme.bgCard, borderColor: theme.border },
              ]}
            >
              <View style={styles.cardRow}>
                <Text style={styles.typeIcon}>{TYPE_ICONS[item.type] ?? '🔔'}</Text>
                <View style={styles.cardBody}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {isUnread && <View style={[styles.dot, { backgroundColor: theme.accent }]} />}
                  </View>
                  <Text style={[styles.cardBody2, { color: theme.textSub }]} numberOfLines={2}>
                    {item.body}
                  </Text>
                  <Text style={[styles.cardTime, { color: theme.textMuted }]}>
                    {new Date(item.createdAt).toLocaleString()}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 12, gap: 8 },
  topBar: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  unreadLabel: { fontSize: 13, fontWeight: '600' },
  markAllBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  markAllText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  typeIcon: { fontSize: 22, marginTop: 2 },
  cardBody: { flex: 1 },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginBottom: 4 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
  dot: { borderRadius: 4, height: 8, width: 8 },
  cardBody2: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  cardTime: { fontSize: 11 },
  btn: { borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
