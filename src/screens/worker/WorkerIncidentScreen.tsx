import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';
import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActionButton } from '../../components/ActionButton';
import { createIncident, getMyIncidents, parseApiError } from '../../services/api';
import { enqueue } from '../../utils/offlineQueue';
import type { AuthSession } from '../../types/auth';
import { useEffect } from 'react';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Incident = {
  id: number;
  zone: string;
  category: string;
  severity: string;
  description: string;
  status: string;
  firstAidGiven: boolean;
  hospitalRequired: boolean;
  reportedAt: string;
};

type Props = { session: AuthSession };

const CATEGORIES = ['Injury', 'Near Miss', 'Equipment Damage', 'Environmental'];
const SEVERITIES = ['Minor', 'Serious', 'Critical'];
const ZONES = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Main Site', 'Processing Area'];

const SEVERITY_COLORS: Record<string, string> = {
  Minor: '#1f6f5b',
  Serious: '#a15c00',
  Critical: '#b42318',
};

const CATEGORY_ICON_MAP: Record<string, ComponentProps<typeof Ionicons>['name']> = {
  'Injury': 'body',
  'Near Miss': 'warning',
  'Equipment Damage': 'construct',
  'Environmental': 'leaf',
};

function CategoryIcon({ category, size = 14, color }: { category: string; size?: number; color: string }) {
  return <Ionicons name={CATEGORY_ICON_MAP[category] ?? 'alert-circle'} size={size} color={color} />;
}

function IncidentPhoto({ photoData }: { photoData: string }) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const [expanded, setExpanded] = useState(false);
  return (
    <Pressable onPress={() => setExpanded((e) => !e)} style={{ marginTop: 8 }}>
      {expanded ? (
        <Image source={{ uri: `data:image/jpeg;base64,${photoData}` }} style={{ borderRadius: 8, height: 180, width: '100%' }} resizeMode="cover" />
      ) : (
        <View style={{ alignItems: 'center', backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', paddingVertical: 10 }}>
          <Ionicons name="camera" size={16} color={theme.textSub} />
          <Text style={{ color: theme.textSub, fontSize: 13, fontWeight: '700' }}>Tap to view photo</Text>
        </View>
      )}
    </Pressable>
  );
}

export function WorkerIncidentScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [zone, setZone] = useState('Zone A');
  const [category, setCategory] = useState('Injury');
  const [severity, setSeverity] = useState('Minor');
  const [description, setDescription] = useState('');
  const [involvedPersons, setInvolvedPersons] = useState('');
  const [immediateAction, setImmediateAction] = useState('');
  const [firstAidGiven, setFirstAidGiven] = useState(false);
  const [hospitalRequired, setHospitalRequired] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  function load() { getMyIncidents().then(setIncidents).catch(() => {}); }
  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Camera access is required.'); return; }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.3, allowsEditing: true, exif: false });
    if (!result.canceled && result.assets[0].base64) {
      const b64 = result.assets[0].base64;
      if (b64.length > 3 * 1024 * 1024) {
        Alert.alert('Photo too large', 'Image exceeds 3 MB. Please retake a smaller photo.');
        return;
      }
      setPhoto(b64);
    }
  }

  async function submit() {
    if (!description.trim()) { Alert.alert('Missing details', 'Describe what happened.'); return; }
    setLoading(true);
    try {
      let latitude: number | undefined;
      let longitude: number | undefined;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const last = await Location.getLastKnownPositionAsync();
          if (last) {
            latitude = last.coords.latitude;
            longitude = last.coords.longitude;
          } else {
            const fresh = await Promise.race([
              Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
            ]);
            if (fresh) { latitude = fresh.coords.latitude; longitude = fresh.coords.longitude; }
          }
        }
      } catch {}

      const payload = {
        zone, category, severity,
        description: description.trim(),
        involvedPersons: involvedPersons.trim() || undefined,
        immediateAction: immediateAction.trim() || undefined,
        firstAidGiven,
        hospitalRequired,
        latitude,
        longitude,
        photoData: photo ?? undefined,
        incidentAt: new Date().toISOString().slice(0, 19),
      };

      const netState = await NetInfo.fetch();
      const isOnline = netState.isConnected && netState.isInternetReachable !== false;
      if (!isOnline) {
        await enqueue('incident', payload as Record<string, unknown>);
        setDescription('');
        setInvolvedPersons('');
        setImmediateAction('');
        setFirstAidGiven(false);
        setHospitalRequired(false);
        setPhoto(null);
        Alert.alert('Saved offline', 'Incident report queued — will send automatically when you reconnect.');
        return;
      }

      const incident = await createIncident(payload);

      setIncidents((c) => [incident, ...c]);
      setDescription('');
      setInvolvedPersons('');
      setImmediateAction('');
      setFirstAidGiven(false);
      setHospitalRequired(false);
      setPhoto(null);
      Alert.alert('Incident reported', severity === 'Critical' || severity === 'Serious'
        ? 'Your supervisor and safety officer have been notified.'
        : 'Incident recorded successfully.');
    } catch (e) {
      Alert.alert('Failed', parseApiError(e));
    } finally { setLoading(false); }
  }

  function formatDate(dateStr: string) {
    try { return new Date(dateStr).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return dateStr; }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Text style={styles.pageTitle}>Report Incident</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Incident Details</Text>

        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.pillRow}>
          {CATEGORIES.map((c) => (
            <Pressable key={c} onPress={() => setCategory(c)} style={[styles.pill, category === c && styles.pillActive]}>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 4 }}>
                <CategoryIcon category={c} size={13} color={category === c ? '#ffffff' : theme.textMuted} />
                <Text style={[styles.pillText, category === c && styles.pillActiveText]}>{c}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Severity</Text>
        <View style={styles.pillRow}>
          {SEVERITIES.map((s) => (
            <Pressable key={s} onPress={() => setSeverity(s)} style={[styles.pill, severity === s && { backgroundColor: SEVERITY_COLORS[s], borderColor: SEVERITY_COLORS[s] }]}>
              <Text style={[styles.pillText, severity === s && styles.pillActiveText]}>{s}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Zone</Text>
        <View style={styles.pillRow}>
          {ZONES.map((z) => (
            <Pressable key={z} onPress={() => setZone(z)} style={[styles.pill, zone === z && styles.pillActive]}>
              <Text style={[styles.pillText, zone === z && styles.pillActiveText]}>{z}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>What Happened</Text>
        <TextInput multiline onChangeText={setDescription} placeholder="Describe the incident in detail..." placeholderTextColor={theme.textMuted} style={styles.textArea} value={description} />

        <Text style={styles.fieldLabel}>Persons Involved</Text>
        <TextInput onChangeText={setInvolvedPersons} placeholder="Names of workers involved (optional)" placeholderTextColor={theme.textMuted} style={styles.input} value={involvedPersons} />

        <Text style={styles.fieldLabel}>Immediate Action Taken</Text>
        <TextInput multiline onChangeText={setImmediateAction} placeholder="What was done immediately after?" placeholderTextColor={theme.textMuted} style={styles.textArea} value={immediateAction} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <Text style={styles.toggleLabel}>First Aid Given</Text>
            <Text style={styles.toggleSub}>Was first aid administered?</Text>
          </View>
          <Switch value={firstAidGiven} onValueChange={setFirstAidGiven} trackColor={{ true: theme.accent }} />
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <Text style={styles.toggleLabel}>Hospital Required</Text>
            <Text style={styles.toggleSub}>Did anyone need hospital treatment?</Text>
          </View>
          <Switch value={hospitalRequired} onValueChange={setHospitalRequired} trackColor={{ true: theme.danger }} />
        </View>

        <Text style={styles.fieldLabel}>Photo Evidence</Text>
        {photo ? (
          <View style={{ marginBottom: 12 }}>
            <Image source={{ uri: `data:image/jpeg;base64,${photo}` }} style={{ borderRadius: 8, height: 160, width: '100%' }} resizeMode="cover" />
            <Pressable onPress={() => setPhoto(null)} style={{ alignItems: 'center', marginTop: 6 }}>
              <Text style={{ color: theme.danger, fontSize: 13, fontWeight: '700' }}>Remove</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={takePhoto} style={styles.photoBtn}>
            <Ionicons name="camera" size={18} color={theme.textSub} />
            <Text style={styles.photoBtnText}>Take Photo</Text>
          </Pressable>
        )}

        <ActionButton label={loading ? 'Submitting...' : 'Submit Incident Report'} onPress={submit} tone="danger" />
      </View>

      <Text style={styles.sectionTitle}>My Incident Reports</Text>
      {incidents.length === 0 ? (
        <View style={styles.emptyCard}><Text style={styles.emptyText}>No incident reports yet</Text></View>
      ) : null}
      {incidents.map((inc) => (
        <View key={inc.id} style={styles.incidentCard}>
          <View style={styles.incidentHeader}>
            <View>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6, marginBottom: 2 }}>
                <CategoryIcon category={inc.category} size={14} color={theme.text} />
                <Text style={styles.incidentCategory}>{inc.category}</Text>
              </View>
              <Text style={styles.incidentZone}>{inc.zone}</Text>
              <Text style={styles.incidentRef}>INC-{String(inc.id).padStart(4, '0')}</Text>
            </View>
            <View style={[styles.severityBadge, { backgroundColor: SEVERITY_COLORS[inc.severity] + '22', borderColor: SEVERITY_COLORS[inc.severity] }]}>
              <Text style={[styles.severityText, { color: SEVERITY_COLORS[inc.severity] }]}>{inc.severity}</Text>
            </View>
          </View>
          <View style={styles.incidentMedical}>
            {inc.firstAidGiven ? (
              <View style={styles.medicalTagView}>
                <Ionicons name="bandage" size={12} color={theme.accent} />
                <Text style={styles.medicalTag}>First Aid</Text>
              </View>
            ) : null}
            {inc.hospitalRequired ? (
              <View style={styles.medicalTagView}>
                <Ionicons name="medical" size={12} color={theme.danger} />
                <Text style={[styles.medicalTag, { color: theme.danger }]}>Hospital</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.incidentFooter}>
            <Text style={styles.incidentTime}>{formatDate(inc.reportedAt)}</Text>
            <View style={[styles.statusPill, inc.status === 'Open' ? styles.statusOpen : inc.status === 'Under Investigation' ? styles.statusInvestigating : styles.statusClosed]}>
              <Text style={styles.statusText}>{inc.status}</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: spacing.xl, paddingBottom: 40 },
    pageTitle: { ...typography.h1, color: theme.text, marginBottom: spacing.lg },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.lg, padding: spacing.lg },
    cardTitle: { ...typography.bodyBold, color: theme.text, marginBottom: 14 },
    fieldLabel: { ...typography.label, color: theme.textSub, marginBottom: spacing.sm, marginTop: spacing.xs },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
    pill: { borderColor: theme.border, borderRadius: 20, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 7 },
    pillActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    pillText: { ...typography.caption, color: theme.textMuted, fontWeight: '800' },
    pillActiveText: { color: '#ffffff' },
    textArea: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, marginBottom: spacing.md, minHeight: 80, padding: spacing.md },
    input: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, marginBottom: spacing.md, minHeight: 44, paddingHorizontal: spacing.md },
    toggleRow: { alignItems: 'center', borderTopColor: theme.bgInput, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md },
    toggleLeft: { flex: 1 },
    toggleLabel: { ...typography.bodyBold, color: theme.text },
    toggleSub: { ...typography.label, color: theme.textMuted, marginTop: 2, textTransform: 'none' as const },
    photoBtn: { alignItems: 'center', borderColor: theme.border, borderRadius: 8, borderStyle: 'dashed', borderWidth: 1.5, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginBottom: 14, paddingVertical: 14 },
    photoBtnText: { ...typography.bodyBold, color: theme.textSub },
    sectionTitle: { ...typography.h3, color: theme.text, marginBottom: spacing.md },
    emptyCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, padding: spacing.xl },
    emptyText: { ...typography.caption, color: theme.textMuted, textAlign: 'center' },
    incidentCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, marginBottom: spacing.sm, padding: spacing.md },
    incidentHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    incidentCategory: { ...typography.bodyBold, color: theme.text },
    incidentZone: { ...typography.label, color: theme.textMuted, textTransform: 'none' as const },
    incidentRef: { ...typography.label, color: theme.textMuted, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', textTransform: 'none' as const },
    severityBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 3 },
    severityText: { fontSize: 11, fontWeight: '900' },
    incidentMedical: { flexDirection: 'row', gap: spacing.sm, marginBottom: 6 },
    medicalTagView: { alignItems: 'center', flexDirection: 'row', gap: 4 },
    medicalTag: { ...typography.caption, color: theme.accent, fontWeight: '700' },
    incidentFooter: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    incidentTime: { ...typography.label, color: theme.textMuted, textTransform: 'none' as const },
    statusPill: { borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 3 },
    statusOpen: { backgroundColor: '#fff5f5' },
    statusInvestigating: { backgroundColor: '#fffbeb' },
    statusClosed: { backgroundColor: '#f0fdf4' },
    statusText: { ...typography.label, color: theme.textSub },
  });
}
