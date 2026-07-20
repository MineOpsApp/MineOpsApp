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

      {/* Floating legend */}
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

    hintCard: {
      position: 'absolute',
      bottom: spacing.md,
      left: spacing.md,
      right: spacing.md,
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
