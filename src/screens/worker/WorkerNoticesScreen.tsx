import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getNotices, markNoticeSeen } from '../../services/api';
import type { Notice } from '../../types/actions';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

export function WorkerNoticesScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [acknowledging, setAcknowledging] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    getNotices().then(setNotices).catch(() => setLoadError(true));
  }, []);

  async function acknowledge(notice: Notice) {
    setAcknowledging(notice.id);
    try {
      const updated = await markNoticeSeen(notice.id, session.user);
      setNotices((c) => c.map((n) => n.id === updated.id ? updated : n));
    } catch {
      Alert.alert('Failed', 'Could not acknowledge notice.');
    } finally {
      setAcknowledging(null);
    }
  }

  const unacknowledged = notices.filter(
    (n) => !n.seenBy.some((s) => s.email.toLowerCase() === session.user.email.toLowerCase())
  );
  const acknowledged = notices.filter(
    (n) => n.seenBy.some((s) => s.email.toLowerCase() === session.user.email.toLowerCase())
  );

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Notices</Text>
        {unacknowledged.length > 0 && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentBadgeText}>{unacknowledged.length} pending</Text>
          </View>
        )}
      </View>

      {unacknowledged.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>ACTION REQUIRED</Text>
          {unacknowledged.map((n) => (
            <View key={n.id} style={styles.urgentCard}>
              <View style={styles.urgentTop}>
                <Text style={styles.urgentFlag}>⚠ Acknowledgment required</Text>
                <Text style={styles.noticeRole}>{n.postedByRole}</Text>
              </View>
              {n.category ? (
                <View style={[styles.categoryBadge,
                  n.category === 'Safety' ? styles.badgeSafety :
                  n.category === 'Administrative' ? styles.badgeAdmin : styles.badgeOps]}>
                  <Text style={styles.categoryText}>{n.category}</Text>
                </View>
              ) : null}
              <Text style={styles.noticeTitle}>{n.title}</Text>
              <Text style={styles.noticeMessage}>{n.message}</Text>
              <Pressable
                onPress={() => acknowledge(n)}
                style={[styles.ackBtn, acknowledging === n.id && styles.ackBtnLoading]}
              >
                <Text style={styles.ackBtnText}>
                  {acknowledging === n.id ? 'Acknowledging...' : '✓  I have read and understood this notice'}
                </Text>
              </Pressable>
            </View>
          ))}
        </>
      ) : (
        <View style={styles.allClearCard}>
          <Text style={styles.allClearIcon}>✓</Text>
          <View>
            <Text style={styles.allClearTitle}>All notices acknowledged</Text>
            <Text style={styles.allClearSub}>You're up to date</Text>
          </View>
        </View>
      )}

      {acknowledged.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>ACKNOWLEDGED</Text>
          {acknowledged.map((n) => (
            <View key={n.id} style={styles.doneCard}>
              <View style={styles.doneLeft}>
                <View style={styles.doneCheck}>
                  <Text style={styles.doneCheckText}>✓</Text>
                </View>
                <View style={styles.doneBody}>
                  {n.category ? (
                    <View style={[styles.categoryBadge,
                      n.category === 'Safety' ? styles.badgeSafety :
                      n.category === 'Administrative' ? styles.badgeAdmin : styles.badgeOps]}>
                      <Text style={styles.categoryText}>{n.category}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.doneTitle}>{n.title}</Text>
                  <Text style={styles.doneMeta}>{n.message}</Text>
                </View>
              </View>
            </View>
          ))}
        </>
      ) : null}

      {loadError && notices.length === 0 ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>Could not load notices. Check your connection.</Text>
        </View>
      ) : notices.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📢</Text>
          <Text style={styles.emptyTitle}>No notices yet</Text>
          <Text style={styles.emptySub}>Site notices will appear here</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: 20, paddingBottom: 40 },
    pageHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 20 },
    pageTitle: { color: theme.text, flex: 1, fontSize: 22, fontWeight: '900' },
    urgentBadge: { backgroundColor: theme.danger, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    urgentBadgeText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
    sectionLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
    urgentCard: { backgroundColor: theme.bgCard, borderColor: theme.danger, borderRadius: 12, borderWidth: 2, marginBottom: 12, overflow: 'hidden' },
    urgentTop: { alignItems: 'center', backgroundColor: theme.dangerLight, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 },
    urgentFlag: { color: theme.danger, fontSize: 12, fontWeight: '800' },
    noticeRole: { color: theme.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    noticeTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 6, paddingHorizontal: 14, paddingTop: 12 },
    noticeMessage: { color: theme.textSub, fontSize: 13, fontWeight: '600', lineHeight: 19, marginBottom: 14, paddingHorizontal: 14 },
    ackBtn: { alignItems: 'center', backgroundColor: theme.accent, margin: 14, marginTop: 0, borderRadius: 8, paddingVertical: 12 },
    ackBtnLoading: { opacity: 0.6 },
    ackBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
    allClearCard: { alignItems: 'center', backgroundColor: '#f0fdf4', borderColor: '#86efac', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 20, padding: 16 },
    allClearIcon: { color: '#16a34a', fontSize: 24 },
    allClearTitle: { color: '#15803d', fontSize: 14, fontWeight: '900' },
    allClearSub: { color: '#4ade80', fontSize: 12, fontWeight: '600', marginTop: 2 },
    doneCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, marginBottom: 8, padding: 12 },
    doneLeft: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
    doneCheck: { alignItems: 'center', backgroundColor: theme.bgInput, borderRadius: 14, height: 28, justifyContent: 'center', width: 28 },
    doneCheckText: { color: theme.accent, fontSize: 14, fontWeight: '900' },
    doneBody: { flex: 1 },
    doneTitle: { color: theme.text, fontSize: 13, fontWeight: '800', marginBottom: 2 },
    doneMeta: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
    emptyCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: 32 },
    emptyIcon: { fontSize: 32, marginBottom: 10 },
    emptyTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 4 },
    emptySub: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
    errorBanner: { backgroundColor: theme.dangerLight, borderColor: '#fca5a5', borderRadius: 8, borderWidth: 1, marginBottom: 12, padding: 14 },
    errorBannerText: { color: theme.danger, fontSize: 13, fontWeight: '700', textAlign: 'center' },
    categoryBadge: { alignSelf: 'flex-start', borderRadius: 6, borderWidth: 1, marginBottom: 4, marginHorizontal: 14, marginTop: 10, paddingHorizontal: 8, paddingVertical: 3 },
    badgeSafety: { backgroundColor: '#fff5f5', borderColor: '#b42318' },
    badgeOps: { backgroundColor: '#fffbeb', borderColor: '#d29922' },
    badgeAdmin: { backgroundColor: '#f0f4ff', borderColor: '#4a6fa5' },
    categoryText: { color: theme.textSub, fontSize: 11, fontWeight: '800' },
  });
}
