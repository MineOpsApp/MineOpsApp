import { useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HazardCard } from '../../components/HazardCard';
import { InputField } from '../../components/InputField';
import { ActionButton } from '../../components/ActionButton';
import { createHazardReport, getHazardReports, parseApiError } from '../../services/api';
import { enqueue } from '../../utils/offlineQueue';
import type { HazardReport } from '../../types/actions';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import type { AuthSession } from '../../types/auth';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };
type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

function getSeverityColors(theme: Theme): Record<Severity, { bg: string; text: string }> {
  return {
    Low: { bg: theme.successLight, text: theme.success },
    Medium: { bg: theme.amberLight, text: theme.amber },
    High: { bg: theme.dangerLight, text: theme.danger },
    Critical: { bg: theme.danger, text: '#ffffff' },
  };
}

export function WorkerHazardsScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);
  const severityColors = getSeverityColors(theme);

  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hazardType, setHazardType] = useState('Ground instability');
  const [hazardLocation, setHazardLocation] = useState('Zone A');
  const [hazardDescription, setHazardDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>('Medium');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    getHazardReports(0).then((data) => {
      setHazards(data.content ?? data);
      setHasMore(data.totalPages ? 0 < data.totalPages - 1 : false);
    }).catch(() => {});
  }, []);

  async function refresh() {
    setRefreshing(true);
    try {
      const data = await getHazardReports(0);
      setHazards(data.content ?? data);
      setHasMore(data.totalPages ? 0 < data.totalPages - 1 : false);
      setPage(0);
    } catch {}
    setRefreshing(false);
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.3,
      allowsEditing: true,
      exif: false,
    });
    if (!result.canceled && result.assets[0].base64) {
      setPhoto(result.assets[0].base64);
    }
  }

  async function loadMore() {
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const data = await getHazardReports(nextPage);
      setHazards((c) => [...c, ...(data.content ?? [])]);
      setPage(nextPage);
      setHasMore(nextPage < data.totalPages - 1);
    } catch {} finally { setLoadingMore(false); }
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
          // Use cached location first (instant); only do a fresh fetch if nothing is cached
          const last = await Location.getLastKnownPositionAsync();
          if (last) {
            latitude = last.coords.latitude;
            longitude = last.coords.longitude;
          } else {
            const fresh = await Promise.race([
              Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
            ]);
            if (fresh) {
              latitude = fresh.coords.latitude;
              longitude = fresh.coords.longitude;
            }
          }
        }
      } catch { /* location optional */ }

      const payload = {
        description,
        hazardType: hazardType.trim() || 'General',
        location: hazardLocation.trim() || 'Unspecified',
        reportedByEmail: session.user.email,
        reportedByName: session.user.fullName,
        reportedByRole: session.user.role,
        site: session.user.assignedSite ?? 'Obuasi Mine',
        severity,
        latitude,
        longitude,
        photoData: photo ?? undefined,
      };

      const netState = await NetInfo.fetch();
      const isOnline = netState.isConnected && netState.isInternetReachable !== false;
      if (!isOnline) {
        await enqueue('hazard', payload as Record<string, unknown>);
        setHazardDescription('');
        Alert.alert('Saved offline', 'Hazard report queued — will send automatically when you reconnect.');
        return;
      }

      const report = await createHazardReport(payload);
      setHazards((c) => [report, ...c]);
      setHazardDescription('');
      Alert.alert('Hazard reported', `HZ-${String(report.id).padStart(4, '0')} sent to safety team.${latitude ? '\n📍 Location recorded.' : ''}`);
    } catch (e) {
      Alert.alert('Failed', parseApiError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>

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
                severity === level && { backgroundColor: severityColors[level].bg, borderColor: severityColors[level].text },
              ]}
            >
              <Text style={[styles.severityBtnText, severity === level && { color: severityColors[level].text }]}>{level}</Text>
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
            <Ionicons name="camera" size={18} color={theme.textSub} />
            <Text style={styles.photoBtnText}>Take Photo</Text>
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
          <Ionicons name="clipboard-outline" size={40} color={theme.textMuted} style={{ marginBottom: 10 }} />
          <Text style={styles.emptyTitle}>No reports yet</Text>
          <Text style={styles.emptySub}>Use the form above to report a hazard</Text>
        </View>
      ) : null}
      {hazards.map((h) => (
        <HazardCard key={h.id} hazard={h} canReview={false} canClear={false} onReview={() => {}} onClear={() => {}} />
      ))}
      {hasMore ? (
        <Pressable onPress={loadMore} style={styles.loadMoreBtn}>
          <Text style={styles.loadMoreText}>{loadingMore ? 'Loading...' : 'Load More'}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: spacing.xl, paddingBottom: 40 },
    pageHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: spacing.lg },
    pageTitle: { ...typography.h1, color: theme.text, flex: 1 },
    countBadge: { backgroundColor: theme.bgHero, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    countText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
    formCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.xxl, padding: spacing.lg },
    fieldLabel: { ...typography.label, color: theme.textSub, marginBottom: spacing.sm, marginTop: spacing.xs },
    severityRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
    severityBtn: { alignItems: 'center', borderColor: theme.border, borderRadius: 8, borderWidth: 1, flex: 1, paddingVertical: 10 },
    severityBtnText: { ...typography.caption, color: theme.textMuted, fontWeight: '800' },
    historyHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: spacing.md },
    sectionTitle: { ...typography.h3, color: theme.text, flex: 1 },
    sectionCount: { ...typography.bodyBold, color: theme.textMuted },
    emptyCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: spacing.xxxl },
    emptyTitle: { ...typography.bodyBold, color: theme.text, marginBottom: spacing.xs },
    emptySub: { ...typography.caption, color: theme.textMuted, textAlign: 'center' },
    photoBtn: { alignItems: 'center', borderColor: theme.border, borderRadius: 8, borderStyle: 'dashed', borderWidth: 1.5, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginBottom: spacing.lg, paddingVertical: spacing.lg },
    photoBtnText: { ...typography.bodyBold, color: theme.textSub },
    photoPreview: { marginBottom: spacing.lg },
    photoImage: { borderRadius: 8, height: 180, width: '100%' },
    removePhoto: { alignItems: 'center', marginTop: spacing.sm },
    removePhotoText: { ...typography.bodyBold, color: theme.danger },
    loadMoreBtn: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, marginTop: spacing.sm, paddingVertical: spacing.md },
    loadMoreText: { ...typography.bodyBold, color: theme.accent },
  });
}
