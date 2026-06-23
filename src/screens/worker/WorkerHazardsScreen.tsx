import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HazardCard } from '../../components/HazardCard';
import { InputField } from '../../components/InputField';
import { ActionButton } from '../../components/ActionButton';
import { createHazardReport, getHazardReports } from '../../services/api';
import type { HazardReport } from '../../types/actions';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };
type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

const SEVERITY_COLORS: Record<Severity, { bg: string; text: string }> = {
  Low: { bg: '#122620', text: '#3fb950' },
  Medium: { bg: '#2d2015', text: '#d29922' },
  High: { bg: '#2d1117', text: '#f85149' },
  Critical: { bg: '#3b0000', text: '#ffffff' },
};

export function WorkerHazardsScreen({ session }: Props) {
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [hazardType, setHazardType] = useState('Ground instability');
  const [hazardLocation, setHazardLocation] = useState('Zone A');
  const [hazardDescription, setHazardDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>('Medium');
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    getHazardReports(session.user.email).then(setHazards).catch(() => {});
  }, []);

  async function takePhoto() {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Camera access is required to take photos.');
    return;
  }
  const result = await ImagePicker.launchCameraAsync({
    base64: true,
    quality: 0.5,
    allowsEditing: true,
    exif: false,
  });
  if (!result.canceled && result.assets[0].base64) {
    setPhoto(result.assets[0].base64);
  }
}
  async function submit() {
    const description = hazardDescription.trim();
    if (!description) { Alert.alert('Missing details', 'Enter the hazard details.'); return; }
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
      } catch { /* location optional */ }

      const report = await createHazardReport({
        description,
        hazardType: hazardType.trim() || 'General',
        location: hazardLocation.trim() || 'Unspecified',
        reportedByEmail: session.user.email,
        reportedByName: session.user.fullName,
        reportedByRole: session.user.role,
        site: 'Obuasi Mine',
        severity,
        latitude,
        longitude,
        photoData: photo ?? undefined,
      });
      setHazards((c) => [report, ...c]);
      setHazardDescription('');
      Alert.alert('Hazard reported', `Report #${report.id} sent to safety team.`);
    } catch {
      Alert.alert('Failed', 'Could not submit the hazard report.');
    } finally {
      setLoading(false);
    }
  }
  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Report Hazard</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{hazards.length}</Text>
        </View>
      </View>

      {/* Form card */}
      <View style={styles.formCard}>
        <InputField label="Hazard Type" onChangeText={setHazardType} value={hazardType} />
        <InputField label="Location" onChangeText={setHazardLocation} value={hazardLocation} />
        <InputField label="Description" multiline onChangeText={setHazardDescription} value={hazardDescription} placeholder="Describe what you observed..." />

        <Text style={styles.fieldLabel}>Severity Level</Text>
        <View style={styles.severityRow}>
          {(['Low', 'Medium', 'High', 'Critical'] as Severity[]).map((level) => (
            <Pressable
              key={level}
              onPress={() => setSeverity(level)}
              style={[
                styles.severityBtn,
                severity === level && { backgroundColor: SEVERITY_COLORS[level].bg, borderColor: SEVERITY_COLORS[level].text },
              ]}
            >
              <Text style={[styles.severityBtnText, severity === level && { color: SEVERITY_COLORS[level].text }]}>{level}</Text>
            </Pressable>
          ))}
        </View>
          <Text style={styles.fieldLabel}>Photo Evidence</Text>
  {photo ? (
  <View style={styles.photoPreview}>
    <Image source={{ uri: `data:image/jpeg;base64,${photo}` }} style={styles.photoImage} />
    <Pressable onPress={() => setPhoto(null)} style={styles.removePhoto}>
      <Text style={styles.removePhotoText}>Remove</Text>
    </Pressable>
  </View>
) : (
  <Pressable onPress={takePhoto} style={styles.photoBtn}>
    <Text style={styles.photoBtnText}>📷 Take Photo</Text>
  </Pressable>
)}
        <ActionButton label={loading ? 'Submitting...' : 'Submit Hazard Report'} onPress={submit} tone="danger" />
      </View>

      {/* History */}
      <View style={styles.historyHeader}>
        <Text style={styles.sectionTitle}>My Reports</Text>
        <Text style={styles.sectionCount}>{hazards.length} total</Text>
      </View>

      {hazards.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No reports yet</Text>
          <Text style={styles.emptySub}>Use the form above to report a hazard</Text>
        </View>
      ) : null}
      {hazards.map((h) => (
        <HazardCard key={h.id} hazard={h} canReview={false} canClear={false} onReview={() => {}} onClear={() => {}} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f0f2f5', padding: 20, paddingBottom: 40 },
  pageHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 16 },
  pageTitle: { color: '#17212b', flex: 1, fontSize: 22, fontWeight: '900' },
  countBadge: { backgroundColor: '#17212b', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  countText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  formCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, marginBottom: 24, padding: 16 },
  fieldLabel: { color: '#5d6875', fontSize: 12, fontWeight: '800', letterSpacing: 0.3, marginBottom: 8, marginTop: 4, textTransform: 'uppercase' },
  severityRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  severityBtn: { alignItems: 'center', borderColor: '#e5e9ef', borderRadius: 8, borderWidth: 1, flex: 1, paddingVertical: 10 },
  severityBtnText: { color: '#8fa3b8', fontSize: 12, fontWeight: '800' },
  historyHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 12 },
  sectionTitle: { color: '#17212b', flex: 1, fontSize: 16, fontWeight: '900' },
  sectionCount: { color: '#8fa3b8', fontSize: 13, fontWeight: '700' },
  emptyCard: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, padding: 32 },
  emptyIcon: { fontSize: 32, marginBottom: 10 },
  emptyTitle: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  emptySub: { color: '#8fa3b8', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  photoBtn: { alignItems: 'center', borderColor: '#e5e9ef', borderRadius: 8, borderStyle: 'dashed', borderWidth: 1.5, marginBottom: 16, paddingVertical: 16 },
photoBtnText: { color: '#5d6875', fontSize: 14, fontWeight: '700' },
photoPreview: { marginBottom: 16 },
photoImage: { borderRadius: 8, height: 180, width: '100%' },
removePhoto: { alignItems: 'center', marginTop: 8 },
removePhotoText: { color: '#b42318', fontSize: 13, fontWeight: '700' },
});