import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  getJobPostings,
  createJobPosting,
  closeJobPosting,
  expressJobInterest,
  parseApiError,
  type JobPosting,
} from '../../services/api';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

export default function JobBoardScreen({
  isSupervisor = false,
  userEmail = '',
}: {
  isSupervisor?: boolean;
  userEmail?: string;
}) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [interestingId, setInterestingId] = useState<number | null>(null);
  const [interestMsg, setInterestMsg] = useState('');
  const [interestModalVisible, setInterestModalVisible] = useState(false);
  const [sendingInterest, setSendingInterest] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      setJobs(await getJobPostings());
    } catch (e: any) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submitJob() {
    if (!title.trim()) { Alert.alert('Missing', 'Title is required'); return; }
    setSubmitting(true);
    try {
      const job = await createJobPosting({ title: title.trim(), description: description.trim() });
      setJobs(prev => [job, ...prev]);
      setModalVisible(false);
      setTitle(''); setDescription('');
    } catch (e: any) {
      Alert.alert('Error', parseApiError(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClose(id: number) {
    Alert.alert('Close job posting?', 'This will stop new applicants.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close',
        style: 'destructive',
        onPress: async () => {
          try {
            const updated = await closeJobPosting(id);
            setJobs(prev => prev.map(j => j.id === id ? updated : j));
          } catch (e: any) {
            Alert.alert('Error', parseApiError(e));
          }
        },
      },
    ]);
  }

  async function sendInterest() {
    if (!interestingId) return;
    setSendingInterest(true);
    try {
      await expressJobInterest(interestingId, interestMsg.trim() || undefined);
      Alert.alert('Done', 'Interest submitted.');
      setInterestModalVisible(false);
      setInterestMsg('');
      setInterestingId(null);
    } catch (e: any) {
      Alert.alert('Error', parseApiError(e));
    } finally {
      setSendingInterest(false);
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#f59e0b" /></View>;
  }

  return (
    <View style={styles.container}>
      {isSupervisor && (
        <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.createBtnText}>+ Post Job</Text>
        </TouchableOpacity>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={jobs}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No open job postings.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <View style={[styles.statusBadge, item.status !== 'OPEN' && styles.closedBadge]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.siteMeta}>{item.site} · {item.postedByName}</Text>
            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
            <View style={styles.actions}>
              {!isSupervisor && item.status === 'OPEN' && (
                <TouchableOpacity
                  style={styles.interestBtn}
                  onPress={() => { setInterestingId(item.id); setInterestModalVisible(true); }}
                >
                  <Text style={styles.interestBtnText}>Express Interest</Text>
                </TouchableOpacity>
              )}
              {isSupervisor && item.postedByEmail === userEmail && item.status === 'OPEN' && (
                <TouchableOpacity style={styles.closeBtn} onPress={() => handleClose(item.id)}>
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Post a Job</Text>
            <TextInput style={styles.input} placeholder="Job title" placeholderTextColor={theme.textMuted} value={title} onChangeText={setTitle} />
            <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} placeholder="Description (optional)" placeholderTextColor={theme.textMuted} value={description} onChangeText={setDescription} multiline />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.5 }]} onPress={submitJob} disabled={submitting}>
                <Text style={styles.submitBtnText}>{submitting ? 'Posting…' : 'Post'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={interestModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Express Interest</Text>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Optional message..." placeholderTextColor={theme.textMuted} value={interestMsg} onChangeText={setInterestMsg} multiline />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setInterestModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, sendingInterest && { opacity: 0.5 }]} onPress={sendInterest} disabled={sendingInterest}>
                <Text style={styles.submitBtnText}>{sendingInterest ? 'Sending…' : 'Submit'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
    createBtn: { margin: 12, backgroundColor: theme.accent, borderRadius: 8, padding: 12, alignItems: 'center' },
    createBtnText: { color: '#0f172a', fontWeight: '700' },
    error: { color: theme.danger, margin: 12, textAlign: 'center' },
    empty: { color: theme.textMuted, textAlign: 'center', marginTop: 40 },
    card: { backgroundColor: theme.bgCard, margin: 8, marginHorizontal: 12, borderRadius: 10, padding: 14 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    cardTitle: { color: theme.text, fontSize: 15, fontWeight: '700', flex: 1 },
    statusBadge: { backgroundColor: '#22c55e', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    closedBadge: { backgroundColor: theme.bgInput },
    statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
    siteMeta: { color: theme.textSub, fontSize: 12, marginBottom: 4 },
    desc: { color: theme.textSub, fontSize: 13 },
    actions: { flexDirection: 'row', marginTop: 10, gap: 8 },
    interestBtn: { backgroundColor: '#3b82f6', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
    interestBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    closeBtn: { backgroundColor: theme.danger, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
    closeBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalSheet: { backgroundColor: theme.bgCard, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
    modalTitle: { color: theme.text, fontSize: 18, fontWeight: '700', marginBottom: 12 },
    input: { backgroundColor: theme.bg, borderRadius: 8, padding: 12, color: theme.text, marginBottom: 10 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16 },
    cancelText: { color: theme.textSub, fontWeight: '600' },
    submitBtn: { backgroundColor: theme.accent, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
    submitBtnText: { color: '#0f172a', fontWeight: '700' },
  });
}
