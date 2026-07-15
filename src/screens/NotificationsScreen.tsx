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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useTheme, spacing, typography, type Theme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import {
  type AppNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/api';
import { formatAgo } from '../utils/time';

type IconSpec =
  | { lib: 'ionicons'; name: ComponentProps<typeof Ionicons>['name'] }
  | { lib: 'material'; name: ComponentProps<typeof MaterialCommunityIcons>['name'] };

const TYPE_META: Record<string, { icon: IconSpec; tone: 'danger' | 'amber' | 'success' | 'info'; label: string }> = {
  SOS:                { icon: { lib: 'material', name: 'alert-octagon' },     tone: 'danger',  label: 'SOS Alert' },
  DANGER_ZONE:        { icon: { lib: 'material', name: 'alert-decagram' },    tone: 'danger',  label: 'Danger Zone' },
  INCIDENT:           { icon: { lib: 'ionicons', name: 'alert-circle' },      tone: 'danger',  label: 'Incident' },
  HAZARD:             { icon: { lib: 'ionicons', name: 'warning' },           tone: 'amber',   label: 'Hazard' },
  BLAST:              { icon: { lib: 'material', name: 'bomb' },              tone: 'amber',   label: 'Blast' },
  NOTICE:             { icon: { lib: 'ionicons', name: 'megaphone' },         tone: 'info',    label: 'Notice' },
  SHIFT_LOG:          { icon: { lib: 'ionicons', name: 'clipboard' },         tone: 'info',    label: 'Shift Log' },
  MESSAGE:            { icon: { lib: 'ionicons', name: 'chatbubbles' },       tone: 'info',    label: 'Message' },
  OFFER:              { icon: { lib: 'material', name: 'handshake' },         tone: 'success', label: 'Offer' },
  BUYER_VERIFICATION: { icon: { lib: 'ionicons', name: 'checkmark-circle' },  tone: 'success', label: 'Verification' },
};
const DEFAULT_META: { icon: IconSpec; tone: 'info'; label: string } = {
  icon: { lib: 'ionicons', name: 'notifications' },
  tone: 'info',
  label: 'Notification',
};

function toneColors(theme: Theme, tone: 'danger' | 'amber' | 'success' | 'info') {
  const map = {
    danger:  { fg: theme.danger,  bg: theme.dangerLight },
    amber:   { fg: theme.amber,   bg: theme.amberLight },
    success: { fg: theme.success, bg: theme.successLight },
    info:    { fg: theme.info,    bg: theme.infoLight },
  };
  return map[tone];
}

type Props = { onUnreadChange?: (count: number) => void };

export function NotificationsScreen({ onUnreadChange }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

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
        <Text style={{ color: theme.danger, marginBottom: spacing.md }}>{error}</Text>
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
            <Ionicons name="checkmark-done" size={14} color="#fff" />
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
          <View style={styles.emptyContent}>
            <Ionicons name="notifications-off-outline" size={40} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No notifications yet</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isUnread = !item.readAt;
          const meta = TYPE_META[item.type] ?? DEFAULT_META;
          const { fg, bg } = toneColors(theme, meta.tone);
          return (
            <Pressable
              onPress={() => isUnread && handleMarkRead(item.id)}
              style={[
                styles.card,
                {
                  backgroundColor: isUnread ? theme.accentLight : theme.bgCard,
                  borderLeftColor: fg,
                },
              ]}
            >
              <View style={styles.cardRow}>
                <View style={[styles.iconBadge, { backgroundColor: bg }]}>
                  {meta.icon.lib === 'ionicons'
                    ? <Ionicons name={meta.icon.name as ComponentProps<typeof Ionicons>['name']} size={18} color={fg} />
                    : <MaterialCommunityIcons name={meta.icon.name as ComponentProps<typeof MaterialCommunityIcons>['name']} size={18} color={fg} />}
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardCategory, { color: fg }]}>{meta.label}</Text>
                    <Text style={[styles.cardHeaderDot, { color: theme.textMuted }]}> · </Text>
                    <Text style={[styles.cardTime, { color: theme.textMuted }]}>{formatAgo(item.createdAt)}</Text>
                  </View>

                  <View style={styles.titleRow}>
                    <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {isUnread && <View style={[styles.dot, { backgroundColor: theme.accent }]} />}
                  </View>

                  <Text style={[styles.cardBody, { color: theme.textSub }]} numberOfLines={2}>
                    {item.body}
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

function makeStyles(theme: Theme, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyContent: { alignItems: 'center', gap: spacing.md },
    emptyText: { ...typography.body },

    list: { padding: spacing.md, gap: spacing.sm },

    topBar: {
      alignItems: 'center',
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm + 2,
    },
    unreadLabel: { ...typography.label },
    markAllBtn: { alignItems: 'center', borderRadius: 8, flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: 7 },
    markAllText: { ...typography.bodyBold, color: '#fff' },

    card: {
      borderLeftWidth: 3,
      borderRadius: 14,
      elevation: 2,
      padding: spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 4,
    },
    cardRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },

    iconBadge: {
      alignItems: 'center',
      borderRadius: 18,
      height: 36,
      justifyContent: 'center',
      width: 36,
    },

    cardContent: { flex: 1 },
    cardHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: spacing.xs },
    cardCategory: { ...typography.label },
    cardHeaderDot: { ...typography.caption },
    cardTime: { ...typography.caption },

    titleRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
    cardTitle: { ...typography.bodyBold, flex: 1 },
    dot: { borderRadius: 4, height: 8, width: 8 },

    cardBody: { ...typography.body },

    btn: { borderRadius: 10, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm + 2 },
    btnText: { color: '#fff', ...typography.bodyBold },
  });
}
