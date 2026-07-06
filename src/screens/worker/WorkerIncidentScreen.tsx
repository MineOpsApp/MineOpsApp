import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { createIncident, getMyIncidents, parseApiError } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useEffect } from 'react';

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

const CATEGORY_ICONS: Record<string, string> = {
  'Injury': '🤕',
  'Near Miss': '⚠️',
  'Equipment Damage': '🔧',
  'Environmental': '🌿',
};

function IncidentPhoto({ photoData }: { photoData: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Pressable onPress={() => setExpanded((e) => !e)} style={{ marginTop: 8 }}>
      {expanded ? (
        <Image source={{ uri: `data:image/jpeg;base64,${photoData}` }} style={{ borderRadius: 8, height: 180, width: '100%' }} resizeMode="cover" />
      ) : (
        <View style={{ alignItems: 'center', backgroundColor: '#f4f6f8', borderColor: '#e5e9ef', borderRadius: 8, borderWidth: 1, paddingVertical: 10 }}>
          <Text style={{ color: '#5d6875', fontSize: 13, fontWeight: '700' }}>📷 Tap to view photo</Text>
        </View>
      )}
    </Pressable>
  );
}

export function WorkerIncidentScreen({ session }: Props) {
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

  useEffect(() => {
    getMyIncidents().then(setIncidents).catch(() => {});
  }, []);

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Camera access is required.'); return; }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.3, allowsEditing: true, exif: false });
    if (!result.canceled && result.assets[0].base64) setPhoto(result.assets[0].base64);
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
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          latitude = loc.coords.latitude;
          longitude = loc.coords.longitude;
        }
      } catch {}

      const incident = await createIncident({
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
      });

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
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Report Incident</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Incident Details</Text>

        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.pillRow}>
          {CATEGORIES.map((c) => (
            <Pressable key={c} onPress={() => setCategory(c)} style={[styles.pill, category === c && styles.pillActive]}>
              <Text style={[styles.pillText, category === c && styles.pillActiveText]}>{CATEGORY_ICONS[c]} {c}</Text>
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
        <TextInput multiline onChangeText={setDescription} placeholder="Describe the incident in detail..." placeholderTextColor="#8fa3b8" style={styles.textArea} value={description} />

        <Text style={styles.fieldLabel}>Persons Involved</Text>
        <TextInput onChangeText={setInvolvedPersons} placeholder="Names of workers involved (optional)" placeholderTextColor="#8fa3b8" style={styles.input} value={involvedPersons} />

        <Text style={styles.fieldLabel}>Immediate Action Taken</Text>
        <TextInput multiline onChangeText={setImmediateAction} placeholder="What was done immediately after?" placeholderTextColor="#8fa3b8" style={styles.textArea} value={immediateAction} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <Text style={styles.toggleLabel}>First Aid Given</Text>
            <Text style={styles.toggleSub}>Was first aid administered?</Text>
          </View>
          <Switch value={firstAidGiven} onValueChange={setFirstAidGiven} trackColor={{ true: '#1f6f5b' }} />
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <Text style={styles.toggleLabel}>Hospital Required</Text>
            <Text style={styles.toggleSub}>Did anyone need hospital treatment?</Text>
          </View>
          <Switch value={hospitalRequired} onValueChange={setHospitalRequired} trackColor={{ true: '#b42318' }} />
        </View>

        <Text style={styles.fieldLabel}>Photo Evidence</Text>
        {photo ? (
          <View style={{ marginBottom: 12 }}>
            <Image source={{ uri: `data:image/jpeg;base64,${photo}` }} style={{ borderRadius: 8, height: 160, width: '100%' }} resizeMode="cover" />
            <Pressable onPress={() => setPhoto(null)} style={{ alignItems: 'center', marginTop: 6 }}>
              <Text style={{ color: '#b42318', fontSize: 13, fontWeight: '700' }}>Remove</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={takePhoto} style={styles.photoBtn}>
            <Text style={styles.photoBtnText}>📷 Take Photo</Text>
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
              <Text style={styles.incidentCategory}>{CATEGORY_ICONS[inc.category]} {inc.category}</Text>
              <Text style={styles.incidentZone}>{inc.zone}</Text>
            </View>
            <View style={[styles.severityBadge, { backgroundColor: SEVERITY_COLORS[inc.severity] + '22', borderColor: SEVERITY_COLORS[inc.severity] }]}>
              <Text style={[styles.severityText, { color: SEVERITY_COLORS[inc.severity] }]}>{inc.severity}</Text>
            </View>
          </View>
          <View style={styles.incidentMedical}>
            {inc.firstAidGiven ? <Text style={styles.medicalTag}>🩹 First Aid</Text> : null}
            {inc.hospitalRequired ? <Text style={[styles.medicalTag, { color: '#b42318' }]}>🏥 Hospital</Text> : null}
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
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f0f2f5', padding: 20, paddingBottom: 40 },
  pageTitle: { color: '#17212b', fontSize: 22, fontWeight: '900', marginBottom: 16 },
  card: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, marginBottom: 16, padding: 16 },
  cardTitle: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 14 },
  fieldLabel: { color: '#5d6875', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8, marginTop: 4, textTransform: 'uppercase' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  pill: { borderColor: '#e5e9ef', borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  pillActive: { backgroundColor: '#17212b', borderColor: '#17212b' },
  pillText: { color: '#8fa3b8', fontSize: 12, fontWeight: '800' },
  pillActiveText: { color: '#ffffff' },
  textArea: { backgroundColor: '#f4f6f8', borderColor: '#e5e9ef', borderRadius: 8, borderWidth: 1, color: '#17212b', fontSize: 14, marginBottom: 12, minHeight: 80, padding: 12 },
  input: { backgroundColor: '#f4f6f8', borderColor: '#e5e9ef', borderRadius: 8, borderWidth: 1, color: '#17212b', fontSize: 14, marginBottom: 12, minHeight: 44, paddingHorizontal: 12 },
  toggleRow: { alignItems: 'center', borderTopColor: '#f4f6f8', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  toggleLeft: { flex: 1 },
  toggleLabel: { color: '#17212b', fontSize: 14, fontWeight: '700' },
  toggleSub: { color: '#8fa3b8', fontSize: 11, fontWeight: '600', marginTop: 2 },
  photoBtn: { alignItems: 'center', borderColor: '#e5e9ef', borderRadius: 8, borderStyle: 'dashed', borderWidth: 1.5, marginBottom: 14, paddingVertical: 14 },
  photoBtnText: { color: '#5d6875', fontSize: 14, fontWeight: '700' },
  sectionTitle: { color: '#17212b', fontSize: 16, fontWeight: '900', marginBottom: 12 },
  emptyCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, padding: 20 },
  emptyText: { color: '#8fa3b8', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  incidentCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, marginBottom: 8, padding: 12 },
  incidentHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  incidentCategory: { color: '#17212b', fontSize: 14, fontWeight: '900', marginBottom: 2 },
  incidentZone: { color: '#8fa3b8', fontSize: 11, fontWeight: '700' },
  severityBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  severityText: { fontSize: 11, fontWeight: '900' },
  incidentMedical: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  medicalTag: { color: '#1f6f5b', fontSize: 12, fontWeight: '700' },
  incidentFooter: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  incidentTime: { color: '#8fa3b8', fontSize: 11, fontWeight: '600' },
  statusPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusOpen: { backgroundColor: '#fff5f5' },
  statusInvestigating: { backgroundColor: '#fffbeb' },
  statusClosed: { backgroundColor: '#f0fdf4' },
  statusText: { color: '#5d6875', fontSize: 11, fontWeight: '800' },
});