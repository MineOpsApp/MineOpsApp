import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { getSiteAnnouncements, parseApiError, postAnnouncement } from '../../services/api';
import type { ShiftAnnouncement } from '../../types/actions';
import type { AuthSession } from '../../types/auth';
import { formatAgo } from '../../utils/time';
import { useTheme, spacing, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

export function SupervisorAnnouncementsScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

  const [announcements, setAnnouncements] = useState<ShiftAnnouncement[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setAnnouncements(await getSiteAnnouncements());
    } catch { /* silent */ }
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      const created = await postAnnouncement(trimmed);
      setAnnouncements((prev) => [created, ...prev].slice(0, 5));
      setText('');
    } catch (e) {
      Alert.alert('Failed to post', parseApiError(e));
    } finally {
      setSending(false);
    }
  }

  const charCount = text.length;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.accent} />}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Shift Announcements</Text>
          <Text style={styles.pageSub}>
            Broadcast a quick update to all workers on {session.user.assignedSite ?? 'your site'} · expires after 24h
          </Text>
        </View>

        {/* Compose */}
        <View style={styles.composeCard}>
          <TextInput
            style={styles.composeInput}
            placeholder={`Broadcast a quick update…\nE.g. "Meeting at 3pm in Zone B" or "Water supply restored"`}
            placeholderTextColor={theme.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={200}
            returnKeyType="default"
          />
          <View style={styles.composeFooter}>
            <Text style={[styles.charCount, charCount > 160 && styles.charCountWarn]}>
              {charCount}/200
            </Text>
            <Pressable
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!text.trim() || sending}
            >
              {sending
                ? <ActivityIndicator size="small" color="#fff" />
                : (
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
                  <Ionicons name="megaphone-outline" size={16} color="#fff" />
                  <Text style={styles.sendBtnText}>Broadcast</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoText}>Workers receive a push notification and see it on their home screen for 24 hours</Text>
        </View>

        {/* History */}
        {loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: 24 }} />
        ) : announcements.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="megaphone-outline" size={32} color={theme.textMuted} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>No announcements yet</Text>
            <Text style={styles.emptySub}>Post one above to broadcast to all workers</Text>
          </View>
        ) : (
          <>
            <Text style={styles.historyLabel}>Last 5 · Last 24 hours</Text>
            {announcements.map((a) => (
              <View key={a.id} style={styles.announcementCard}>
                <View style={styles.announcementTop}>
                  <Ionicons name="megaphone-outline" size={16} color={theme.accent} />
                  <View style={styles.announcementMeta}>
                    <Text style={styles.announcementBy}>{a.createdByName}</Text>
                    <Text style={styles.announcementTime}>{formatAgo(a.createdAt)}</Text>
                  </View>
                </View>
                <Text style={styles.announcementContent}>{a.content}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
    container: { backgroundColor: theme.bg, padding: spacing.lg, paddingBottom: 40 },

    pageHeader: { marginBottom: spacing.lg },
    pageTitle: { color: theme.text, fontSize: 20, fontWeight: '800' },
    pageSub: { color: theme.textSub, fontSize: 13, lineHeight: 18, marginTop: 2 },

    composeCard: {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 10,
      padding: spacing.md,
      ...cardShadow,
    },
    composeInput: {
      color: theme.text,
      fontSize: 15,
      minHeight: 72,
      textAlignVertical: 'top',
    },
    composeFooter: {
      alignItems: 'center',
      borderTopColor: theme.bgInput,
      borderTopWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
    },
    charCount: { color: theme.textSub, fontSize: 12 },
    charCountWarn: { color: theme.amber },
    sendBtn: {
      alignItems: 'center',
      backgroundColor: theme.accent,
      borderRadius: 8,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    sendBtnDisabled: { opacity: 0.4 },
    sendBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

    infoRow: { marginBottom: spacing.xl },
    infoText: { color: theme.textMuted, fontSize: 12, lineHeight: 17 },

    emptyCard: {
      alignItems: 'center',
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderRadius: 12,
      borderWidth: 1,
      gap: spacing.sm,
      padding: 32,
      ...cardShadow,
    },
    emptyTitle: { color: theme.text, fontSize: 16, fontWeight: '700' },
    emptySub: { color: theme.textSub, fontSize: 13, textAlign: 'center' },

    historyLabel: { color: theme.textSub, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' },

    announcementCard: {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: spacing.sm,
      padding: spacing.md,
      ...cardShadow,
    },
    announcementTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
    announcementMeta: {},
    announcementBy: { color: theme.text, fontSize: 13, fontWeight: '700' },
    announcementTime: { color: theme.textSub, fontSize: 12 },
    announcementContent: { color: theme.textSub, fontSize: 15, lineHeight: 21 },
  });
}
