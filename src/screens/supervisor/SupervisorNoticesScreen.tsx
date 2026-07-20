import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { InputField } from '../../components/InputField';
import { ActionButton } from '../../components/ActionButton';
import { getNotices, createNotice, createSupervisorMessage } from '../../services/api';
import { deleteNotice } from '../../services/api';
import type { Notice } from '../../types/actions';
import type { AuthSession } from '../../types/auth';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

export function SupervisorNoticesScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [title, setTitle] = useState('Zone B restriction');
  const [message, setMessage] = useState('Zone B is restricted until clearance.');
  const [briefing, setBriefing] = useState('Avoid Zone B until clearance is completed.');
  const [category, setCategory] = useState('Operational');
  const [expiryDays, setExpiryDays] = useState<number | null>(null);

  useEffect(() => { getNotices().then(setNotices).catch(() => {}); }, []);

  async function post() {
    try {
      const expiresAt = expiryDays
        ? new Date(Date.now() + expiryDays * 86400000).toISOString().slice(0, 19)
        : undefined;
      const notice = await createNotice({
        title: title.trim() || 'Site Notice',
        message: message.trim() || 'New notice',
        postedByRole: session.user.role,
        actorName: session.user.fullName,
        actorEmail: session.user.email,
        category,
        expiresAt,
      });
      setNotices((c) => [notice, ...c]);
      Alert.alert('Posted', `Notice #${notice.id} posted.`);
    } catch { Alert.alert('Failed', 'Could not post notice.'); }
  }

  async function sendBriefing() {
    try {
      await createSupervisorMessage({ senderRole: session.user.role, actorName: session.user.fullName, actorEmail: session.user.email, audience:`Workers - ${session.user.assignedSite ?? 'Obuasi Mine'}`, message: briefing.trim() || 'Daily briefing sent' });
      Alert.alert('Sent', 'Briefing sent to all workers.');
    } catch { Alert.alert('Failed', 'Could not send briefing.'); }
  }

  async function handleDelete(id: number) {
    Alert.alert('Delete notice?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteNotice(id);
          setNotices((c) => c.filter((n) => n.id !== id));
        } catch { Alert.alert('Failed', 'Could not delete notice.'); }
      }}
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Notices</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📣 Send Briefing</Text>
        <Text style={styles.cardSub}>Broadcast a message to all workers on site</Text>
        <InputField label="Message" multiline onChangeText={setBriefing} value={briefing} />

        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.pillRow}>
          {['Safety', 'Operational', 'Administrative'].map((c) => (
            <Pressable key={c} onPress={() => setCategory(c)} style={[styles.pill, category === c && styles.pillActive]}>
              <Text style={[styles.pillText, category === c && styles.pillActiveText]}>{c}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.cardSub}>Expiry (optional)</Text>
        <View style={styles.pillRow}>
          {[
            { label: 'No expiry', value: null },
            { label: '1 day', value: 1 },
            { label: '3 days', value: 3 },
            { label: '7 days', value: 7 },
            { label: '30 days', value: 30 },
          ].map((opt) => (
            <Pressable key={String(opt.value)} onPress={() => setExpiryDays(opt.value)} style={[styles.pill, expiryDays === opt.value && styles.pillActive]}>
              <Text style={[styles.pillText, expiryDays === opt.value && styles.pillActiveText]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        <ActionButton label="Send Briefing to Workers" onPress={sendBriefing} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📌 Post Notice</Text>
        <Text style={styles.cardSub}>Notices require acknowledgment from workers</Text>
        <InputField label="Title" onChangeText={setTitle} value={title} />
        <InputField label="Message" multiline onChangeText={setMessage} value={message} />
        <ActionButton label="Post Notice" onPress={post} />
      </View>

      <Text style={styles.sectionTitle}>Posted Notices</Text>
      {notices.length === 0 ? (
        <View style={styles.emptyCard}><Text style={styles.emptyText}>No notices posted yet</Text></View>
      ) : null}
      {notices.map((n) => {
        const ackCount = n.seenBy.length;
        return (
          <View key={n.id} style={styles.noticeCard}>
            <View style={styles.noticeTop}>
              <View style={styles.noticeAccent} />
              <View style={styles.noticeBody}>
                <Text style={styles.noticeTitle}>{n.title}</Text>
                <Text style={styles.noticeMessage}>{n.message}</Text>
                <Text style={styles.noticeRole}>Posted by {n.postedByRole}</Text>
                <Pressable onPress={() => handleDelete(n.id)} style={styles.deleteBtn}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </Pressable>

                {n.category ? (
                  <View style={[styles.categoryBadge,
                    n.category === 'Safety' ? styles.badgeSafety :
                    n.category === 'Administrative' ? styles.badgeAdmin : styles.badgeOps]}>
                    <Text style={styles.categoryText}>{n.category}</Text>
                  </View>
                ) : null}
              </View>
              <View style={[styles.ackBadge, ackCount > 0 ? styles.ackBadgeGreen : styles.ackBadgeGrey]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.ackBadgeText, ackCount > 0 ? styles.ackBadgeTextGreen : styles.ackBadgeTextGrey]}>{ackCount}</Text>
                  <Ionicons name="checkmark-circle" size={12} color={ackCount > 0 ? styles.ackBadgeTextGreen.color : styles.ackBadgeTextGrey.color} />
                </View>
              </View>
            </View>
            {ackCount > 0 ? (
              <View style={styles.ackList}>
                {n.seenBy.slice(0, 3).map((s) => (
                  <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="checkmark-circle" size={12} color={styles.ackName.color} />
                    <Text style={styles.ackName}>{s.fullName}</Text>
                  </View>
                ))}
                {n.seenBy.length > 3 ? <Text style={styles.ackMore}>+{n.seenBy.length - 3} more</Text> : null}
              </View>
            ) : (
              <Text style={styles.noAckText}>No acknowledgments yet</Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: 20, paddingBottom: 40 },
    pageTitle: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 16 },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: 16, padding: 16 },
    cardTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 4 },
    cardSub: { color: theme.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 14 },
    sectionTitle: { color: theme.text, fontSize: 16, fontWeight: '900', marginBottom: 12 },
    noticeCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
    noticeTop: { flexDirection: 'row', alignItems: 'flex-start' },
    noticeAccent: { backgroundColor: theme.accent, width: 3, alignSelf: 'stretch' },
    noticeBody: { flex: 1, padding: 12 },
    noticeTitle: { color: theme.text, fontSize: 14, fontWeight: '900', marginBottom: 3 },
    noticeMessage: { color: theme.textSub, fontSize: 12, fontWeight: '600', lineHeight: 17, marginBottom: 4 },
    noticeRole: { color: theme.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    ackBadge: { borderRadius: 12, margin: 12, paddingHorizontal: 10, paddingVertical: 4 },
    ackBadgeGreen: { backgroundColor: theme.accentLight },
    ackBadgeGrey: { backgroundColor: theme.bgInput },
    ackBadgeText: { fontSize: 12, fontWeight: '900' },
    ackBadgeTextGreen: { color: theme.accent },
    ackBadgeTextGrey: { color: theme.textMuted },
    ackList: { borderTopColor: theme.bgInput, borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
    ackName: { color: theme.accent, fontSize: 12, fontWeight: '700', marginBottom: 2 },
    ackMore: { color: theme.textMuted, fontSize: 11, fontWeight: '700' },
    noAckText: { borderTopColor: theme.bgInput, borderTopWidth: 1, color: theme.danger, fontSize: 12, fontWeight: '700', padding: 10 },
    emptyCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: 20 },
    emptyText: { color: theme.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    fieldLabel: { color: theme.textSub, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8, marginTop: 4, textTransform: 'uppercase' },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
    pill: { borderColor: theme.border, borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
    pillActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    pillText: { color: theme.textMuted, fontSize: 12, fontWeight: '800' },
    pillActiveText: { color: '#ffffff' },
    categoryBadge: { alignSelf: 'flex-start', borderRadius: 6, borderWidth: 1, marginTop: 4, paddingHorizontal: 8, paddingVertical: 3 },
    badgeSafety: { backgroundColor: '#fff5f5', borderColor: '#b42318' },
    badgeOps: { backgroundColor: '#fffbeb', borderColor: '#d29922' },
    badgeAdmin: { backgroundColor: '#f0f4ff', borderColor: '#4a6fa5' },
    categoryText: { color: theme.textSub, fontSize: 11, fontWeight: '800' },
    deleteBtn: { alignSelf: 'flex-start', marginTop: 4 },
    deleteBtnText: { color: theme.danger, fontSize: 11, fontWeight: '800' },
  });
}
