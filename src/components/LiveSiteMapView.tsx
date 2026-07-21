import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapboxGL, { Camera, UserLocation, ShapeSource, FillLayer, LineLayer, CircleLayer, PointAnnotation } from '@rnmapbox/maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { createDangerZone, getDangerZones, getSiteHazardAlerts, parseApiError } from '../services/api';
import type { DangerZone, HazardReport } from '../types/actions';
import type { AuthSession } from '../types/auth';
import { useTheme, type Theme, spacing } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';

const RISK_COLOR: Record<string, string> = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#22c55e',
};

type Props = { session: AuthSession };
type PackStatus = 'none' | 'downloading' | 'ready' | 'error';

function circleCoords(lat: number, lng: number, radiusM: number, steps = 32): [number, number][] {
  const latR = lat * (Math.PI / 180);
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    coords.push([
      lng + (radiusM * Math.cos(angle)) / (111320 * Math.cos(latR)),
      lat + (radiusM * Math.sin(angle)) / 111320,
    ]);
  }
  return coords;
}

export function LiveSiteMapView({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const s = makeStyles(theme);

  const mapRef = useRef<MapboxGL.MapView>(null);

  const [initialCoord, setInitialCoord] = useState<[number, number] | null>(null);
  const [locationError, setLocationError] = useState('');
  const [zones, setZones] = useState<DangerZone[]>([]);
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [loading, setLoading] = useState(true);

  const [pendingCoord, setPendingCoord] = useState<[number, number] | null>(null);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneRisk, setNewZoneRisk] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [newZoneRadius, setNewZoneRadius] = useState('50');
  const [saving, setSaving] = useState(false);

  // Offline pack state
  const [packStatus, setPackStatus] = useState<PackStatus>('none');
  const [packProgress, setPackProgress] = useState(0);
  const [packDate, setPackDate] = useState<string | null>(null);

  const packName = `site-${session.user.assignedSite}`;

  useEffect(() => {
    async function setup() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission is required to show the live map.');
        setLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setInitialCoord([pos.coords.longitude, pos.coords.latitude]);
      const [z, h] = await Promise.all([getDangerZones(), getSiteHazardAlerts()]);
      setZones(z);
      setHazards(h.filter((r) => r.latitude != null && r.longitude != null));
      setLoading(false);
    }
    setup().catch(() => {
      setLocationError('Could not start the map. Check permissions and try again.');
      setLoading(false);
    });

    // Check for an existing offline pack for this site
    MapboxGL.offlineManager.getPack(packName).then(pack => {
      if (pack) {
        setPackStatus('ready');
        AsyncStorage.getItem(`offline_pack_date_${packName}`)
          .then(d => { if (d) setPackDate(d); })
          .catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const gpsZones = zones.filter((z) => z.latitude != null && z.longitude != null);

  const zonesGeoJSON = {
    type: 'FeatureCollection' as const,
    features: gpsZones.map((z) => ({
      type: 'Feature' as const,
      id: String(z.id),
      properties: { name: z.zoneName, riskLevel: z.riskLevel, color: RISK_COLOR[z.riskLevel] ?? '#f59e0b' },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [circleCoords(z.latitude!, z.longitude!, z.radiusMeters ?? 50)],
      },
    })),
  };

  const hazardsGeoJSON = {
    type: 'FeatureCollection' as const,
    features: hazards.map((h) => ({
      type: 'Feature' as const,
      id: String(h.id),
      properties: { color: RISK_COLOR[h.severity ?? 'Medium'] ?? '#f59e0b' },
      geometry: { type: 'Point' as const, coordinates: [h.longitude!, h.latitude!] },
    })),
  };

  async function saveZone() {
    if (!pendingCoord || !newZoneName.trim()) {
      Alert.alert('Required', 'Please enter a zone name.');
      return;
    }
    const radius = parseInt(newZoneRadius, 10);
    setSaving(true);
    try {
      const saved = await createDangerZone({
        actorRole: session.user.role,
        actorName: session.user.fullName,
        actorEmail: session.user.email,
        site: session.user.assignedSite ?? '',
        zoneName: newZoneName.trim(),
        riskLevel: newZoneRisk,
        latitude: pendingCoord[1],
        longitude: pendingCoord[0],
        radiusMeters: isNaN(radius) || radius < 1 ? 50 : radius,
      });
      setZones((prev) => [...prev, saved]);
      setPendingCoord(null);
      setNewZoneName('');
      setNewZoneRisk('Medium');
      setNewZoneRadius('50');
    } catch (e) {
      Alert.alert('Error', parseApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function downloadCurrentArea() {
    if (!mapRef.current) return;
    setPackStatus('downloading');
    setPackProgress(0);
    try {
      const bounds = await mapRef.current.getVisibleBounds();
      // Delete any existing pack for this site first to prevent duplicate/orphaned packs
      try { await MapboxGL.offlineManager.deletePack(packName); } catch {}

      await MapboxGL.offlineManager.createPack(
        {
          name: packName,
          styleURL: MapboxGL.StyleURL.Outdoors,
          bounds: bounds as [[number, number], [number, number]],
          minZoom: 10,
          maxZoom: 16,
        },
        (_pack: any, status: any) => {
          const pct = Math.round(status.percentage ?? 0);
          setPackProgress(pct);
          if (pct >= 100) {
            const ts = new Date().toLocaleString();
            setPackDate(ts);
            setPackStatus('ready');
            AsyncStorage.setItem(`offline_pack_date_${packName}`, ts).catch(() => {});
          }
        },
        (_pack: any, error: any) => {
          console.warn('Offline pack download error:', error);
          setPackStatus('error');
        }
      );
    } catch (e) {
      console.warn('Failed to start offline download:', e);
      setPackStatus('error');
    }
  }

  async function deleteOfflinePack() {
    try {
      await MapboxGL.offlineManager.deletePack(packName);
      await AsyncStorage.removeItem(`offline_pack_date_${packName}`);
      setPackStatus('none');
      setPackProgress(0);
      setPackDate(null);
    } catch (e) {
      console.warn('Failed to delete offline pack:', e);
    }
  }

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={theme.accent} size="large" />
        <Text style={s.loadingText}>Loading map…</Text>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={s.centered}>
        <Text style={s.errorText}>{locationError}</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <MapboxGL.MapView
        ref={mapRef}
        style={s.map}
        styleURL={MapboxGL.StyleURL.Outdoors}
        onLongPress={(feature: any) => {
          if (feature?.geometry?.type === 'Point') {
            setPendingCoord(feature.geometry.coordinates as [number, number]);
            setNewZoneName('');
            setNewZoneRisk('Medium');
            setNewZoneRadius('50');
          }
        }}
      >
        {initialCoord && (
          <Camera
            zoomLevel={14}
            centerCoordinate={initialCoord}
            animationMode="flyTo"
            animationDuration={800}
          />
        )}

        <UserLocation visible animated />

        {/* GPS-based danger zones as filled circle polygons */}
        <ShapeSource id="zones" shape={zonesGeoJSON as any}>
          <FillLayer
            id="zonesFill"
            style={{ fillColor: ['get', 'color'] as any, fillOpacity: 0.25 }}
          />
          <LineLayer
            id="zonesOutline"
            style={{ lineColor: ['get', 'color'] as any, lineWidth: 2 }}
          />
        </ShapeSource>

        {/* Hazard report dots colored by severity */}
        <ShapeSource id="hazards" shape={hazardsGeoJSON as any}>
          <CircleLayer
            id="hazardDots"
            style={{
              circleColor: ['get', 'color'] as any,
              circleRadius: 8,
              circleStrokeColor: '#fff',
              circleStrokeWidth: 1.5,
            }}
          />
        </ShapeSource>

        {/* Dropped pin for the zone being created */}
        {pendingCoord && (
          <PointAnnotation id="pending" coordinate={pendingCoord}>
            <View style={s.pendingPin} />
          </PointAnnotation>
        )}
      </MapboxGL.MapView>

      {/* Floating legend — top-left */}
      <View style={s.legend}>
        {(['High', 'Medium', 'Low'] as const).map((r) => (
          <View key={r} style={s.legendRow}>
            <View style={[s.legendDot, { backgroundColor: RISK_COLOR[r] }]} />
            <Text style={s.legendLabel}>{r} risk</Text>
          </View>
        ))}
        <View style={s.legendRow}>
          <View style={[s.legendDot, { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#888' }]} />
          <Text style={s.legendLabel}>Hazard report</Text>
        </View>
      </View>

      {/* Offline pack control — bottom-right, hidden while placing a zone */}
      {!pendingCoord && (
        <View style={s.offlineCard}>
          {packStatus === 'none' && (
            <TouchableOpacity style={s.offlineBtn} onPress={downloadCurrentArea}>
              <Text style={s.offlineBtnText}>📥 Download for offline</Text>
            </TouchableOpacity>
          )}

          {packStatus === 'downloading' && (
            <View style={s.offlineProgress}>
              <Text style={s.offlineProgressLabel}>Downloading… {packProgress}%</Text>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${packProgress}%` as any }]} />
              </View>
              <Text style={s.offlineNote}>Keep this screen open until complete.</Text>
            </View>
          )}

          {packStatus === 'ready' && (
            <View style={s.offlineReady}>
              <Text style={s.offlineReadyTitle}>✓ Available offline</Text>
              {packDate ? <Text style={s.offlineReadyDate}>Downloaded {packDate}</Text> : null}
              <View style={s.offlineReadyActions}>
                <TouchableOpacity style={s.offlineSecondaryBtn} onPress={downloadCurrentArea}>
                  <Text style={s.offlineSecondaryBtnText}>Re-download</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.offlineDeleteBtn} onPress={deleteOfflinePack}>
                  <Text style={s.offlineDeleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {packStatus === 'error' && (
            <View style={s.offlineError}>
              <Text style={s.offlineErrorText}>Download failed — check connection</Text>
              <TouchableOpacity style={s.offlineBtn} onPress={downloadCurrentArea}>
                <Text style={s.offlineBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Hint when no zones and not placing a pin */}
      {!pendingCoord && gpsZones.length === 0 && (
        <View style={s.hintCard}>
          <Text style={s.hintText}>Long-press anywhere on the map to place a new GPS danger zone.</Text>
        </View>
      )}

      {/* New zone creation form */}
      {pendingCoord && (
        <View style={s.form}>
          <Text style={s.formTitle}>New Danger Zone</Text>
          <Text style={s.formSub}>Long-press again to move the pin before saving.</Text>
          <TextInput
            style={s.input}
            placeholder="Zone name"
            placeholderTextColor={theme.textMuted}
            value={newZoneName}
            onChangeText={setNewZoneName}
          />
          <View style={s.pillRow}>
            {(['Low', 'Medium', 'High'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                style={[s.pill, newZoneRisk === r && { backgroundColor: RISK_COLOR[r], borderColor: RISK_COLOR[r] }]}
                onPress={() => setNewZoneRisk(r)}
              >
                <Text style={[s.pillText, newZoneRisk === r && s.pillTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.radiusRow}>
            <Text style={s.radiusLabel}>Radius (m):</Text>
            <TextInput
              style={s.radiusInput}
              placeholder="50"
              placeholderTextColor={theme.textMuted}
              value={newZoneRadius}
              onChangeText={setNewZoneRadius}
              keyboardType="number-pad"
            />
          </View>
          <View style={s.formActions}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setPendingCoord(null)}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.saveBtn, saving && s.btnDisabled]}
              onPress={saveZone}
              disabled={saving}
            >
              <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save Zone'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    root: { flex: 1 },
    map: { flex: 1 },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.bg,
      padding: spacing.lg,
    },
    loadingText: { color: theme.textSub, fontSize: 13, fontWeight: '600', marginTop: spacing.sm },
    errorText: { color: theme.danger, fontSize: 14, fontWeight: '700', textAlign: 'center' },

    pendingPin: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.accent,
      borderWidth: 2.5,
      borderColor: '#fff',
    },

    legend: {
      position: 'absolute',
      top: spacing.sm,
      left: spacing.sm,
      backgroundColor: `${theme.bgCard}ee`,
      borderRadius: 8,
      padding: spacing.sm,
      gap: 3,
    },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendLabel: { color: theme.text, fontSize: 10, fontWeight: '700' },

    // Offline control card — bottom-right
    offlineCard: {
      position: 'absolute',
      bottom: spacing.md,
      right: spacing.sm,
      maxWidth: 200,
      backgroundColor: `${theme.bgCard}f0`,
      borderRadius: 10,
      padding: spacing.sm,
    },
    offlineBtn: {
      backgroundColor: theme.accent,
      borderRadius: 7,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      alignItems: 'center',
    },
    offlineBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },

    offlineProgress: { gap: 4 },
    offlineProgressLabel: { color: theme.text, fontSize: 12, fontWeight: '800' },
    progressTrack: { height: 5, borderRadius: 3, backgroundColor: theme.border, overflow: 'hidden' },
    progressFill: { height: 5, borderRadius: 3, backgroundColor: theme.accent },
    offlineNote: { color: theme.textMuted, fontSize: 10, fontWeight: '600' },

    offlineReady: { gap: 4 },
    offlineReadyTitle: { color: theme.success, fontSize: 12, fontWeight: '900' },
    offlineReadyDate: { color: theme.textMuted, fontSize: 10, fontWeight: '600' },
    offlineReadyActions: { flexDirection: 'row', gap: 4, marginTop: 2 },
    offlineSecondaryBtn: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 6, borderWidth: 1, flex: 1, alignItems: 'center', paddingVertical: 5 },
    offlineSecondaryBtnText: { color: theme.text, fontSize: 11, fontWeight: '800' },
    offlineDeleteBtn: { backgroundColor: '#fff0f0', borderColor: theme.danger, borderRadius: 6, borderWidth: 1, flex: 1, alignItems: 'center', paddingVertical: 5 },
    offlineDeleteBtnText: { color: theme.danger, fontSize: 11, fontWeight: '800' },

    offlineError: { gap: 4 },
    offlineErrorText: { color: theme.danger, fontSize: 11, fontWeight: '700' },

    hintCard: {
      position: 'absolute',
      bottom: spacing.md,
      left: spacing.md,
      right: 220, // leave room for offline card
      backgroundColor: `${theme.bgCard}ee`,
      borderRadius: 10,
      padding: spacing.sm,
    },
    hintText: { color: theme.textSub, fontSize: 13, fontWeight: '600', textAlign: 'center' },

    form: {
      backgroundColor: theme.bgCard,
      borderTopColor: theme.border,
      borderTopWidth: 1,
      padding: spacing.md,
    },
    formTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 2 },
    formSub: { color: theme.textSub, fontSize: 12, fontWeight: '600', marginBottom: spacing.sm },
    input: {
      backgroundColor: theme.bgInput,
      borderColor: theme.border,
      borderRadius: 8,
      borderWidth: 1,
      color: theme.text,
      fontSize: 14,
      fontWeight: '600',
      marginBottom: spacing.sm,
      padding: spacing.sm,
    },
    pillRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
    pill: {
      borderColor: theme.border,
      borderRadius: 6,
      borderWidth: 1,
      flex: 1,
      alignItems: 'center',
      paddingVertical: 6,
    },
    pillText: { color: theme.textSub, fontSize: 12, fontWeight: '800' },
    pillTextActive: { color: '#fff' },
    radiusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    radiusLabel: { color: theme.textSub, fontSize: 13, fontWeight: '700' },
    radiusInput: {
      backgroundColor: theme.bgInput,
      borderColor: theme.border,
      borderRadius: 8,
      borderWidth: 1,
      color: theme.text,
      fontSize: 14,
      fontWeight: '600',
      padding: spacing.xs,
      width: 80,
    },
    formActions: { flexDirection: 'row', gap: spacing.sm },
    saveBtn: {
      backgroundColor: theme.accent,
      borderRadius: 8,
      flex: 1,
      alignItems: 'center',
      padding: spacing.sm,
    },
    saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
    cancelBtn: {
      backgroundColor: theme.bgInput,
      borderColor: theme.border,
      borderRadius: 8,
      borderWidth: 1,
      flex: 1,
      alignItems: 'center',
      padding: spacing.sm,
    },
    cancelBtnText: { color: theme.text, fontSize: 14, fontWeight: '700' },
    btnDisabled: { opacity: 0.5 },
  });
}
