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
  getCommunityEvents,
  createCommunityEvent,
  parseApiError,
  type CommunityEvent,
} from '../../services/api';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

const EVENT_TYPES = ['General', 'Training', 'Safety Drill', 'Community Meeting', 'Trade Fair'];

export default function EventsScreen({ canCreate = false }: { canCreate?: boolean }) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('General');
  const [eventDate, setEventDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      setEvents(await getCommunityEvents());
    } catch (e: any) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    if (!title.trim() || !eventDate.trim()) {
      Alert.alert('Missing fields', 'Title and event date are required (ISO format e.g. 2026-08-15T10:00:00).');
      return;
    }
    setSubmitting(true);
    try {
      const ev = await createCommunityEvent({ title: title.trim(), description: description.trim(), eventType, eventDate: eventDate.trim() });
      setEvents(prev => [ev, ...prev]);
      setModalVisible(false);
      setTitle(''); setDescription(''); setEventDate('');
    } catch (e: any) {
      Alert.alert('Error', parseApiError(e));
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#f59e0b" /></View>;
  }

  return (
    <View style={styles.container}>
      {canCreate && (
        <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.createBtnText}>+ Create Event</Text>
        </TouchableOpacity>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={events}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No upcoming events.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{item.eventType}</Text>
              </View>
            </View>
            <Text style={styles.dateText}>{formatDate(item.eventDate)}</Text>
            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
            <Text style={styles.byText}>by {item.createdByName}</Text>
          </View>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Create Event</Text>
            <TextInput style={styles.input} placeholder="Title" placeholderTextColor={theme.textMuted} value={title} onChangeText={setTitle} />
            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Description (optional)" placeholderTextColor={theme.textMuted} value={description} onChangeText={setDescription} multiline />
            <TextInput style={styles.input} placeholder="Event date (e.g. 2026-08-15T10:00:00)" placeholderTextColor={theme.textMuted} value={eventDate} onChangeText={setEventDate} />
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>
              {EVENT_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, eventType === t && styles.typeChipActive]}
                  onPress={() => setEventType(t)}
                >
                  <Text style={[styles.typeChipText, eventType === t && styles.typeChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.5 }]} onPress={submit} disabled={submitting}>
                <Text style={styles.submitBtnText}>{submitting ? 'Creating…' : 'Create'}</Text>
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
    createBtn: { margin: 12, backgroundColor: '#f59e0b', borderRadius: 8, padding: 12, alignItems: 'center' },
    createBtnText: { color: '#0f172a', fontWeight: '700' },
    error: { color: theme.danger, margin: 12, textAlign: 'center' },
    empty: { color: theme.textMuted, textAlign: 'center', marginTop: 40 },
    card: { backgroundColor: theme.bgCard, margin: 8, marginHorizontal: 12, borderRadius: 10, padding: 14 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    cardTitle: { color: theme.text, fontSize: 15, fontWeight: '700', flex: 1 },
    typeBadge: { backgroundColor: '#3b82f6', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    typeBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
    dateText: { color: '#f59e0b', fontSize: 13, marginBottom: 4 },
    desc: { color: theme.textSub, fontSize: 13 },
    byText: { color: theme.textMuted, fontSize: 12, marginTop: 4 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalSheet: { backgroundColor: theme.bgCard, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
    modalTitle: { color: theme.text, fontSize: 18, fontWeight: '700', marginBottom: 12 },
    input: { backgroundColor: theme.bg, borderRadius: 8, padding: 12, color: theme.text, marginBottom: 10 },
    label: { color: theme.textSub, fontSize: 13, marginBottom: 6 },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
    typeChip: { backgroundColor: theme.bgInput, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
    typeChipActive: { backgroundColor: '#f59e0b' },
    typeChipText: { color: theme.textSub, fontSize: 12 },
    typeChipTextActive: { color: '#0f172a', fontWeight: '700' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16 },
    cancelText: { color: theme.textSub, fontWeight: '600' },
    submitBtn: { backgroundColor: '#f59e0b', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
    submitBtnText: { color: '#0f172a', fontWeight: '700' },
  });
}
