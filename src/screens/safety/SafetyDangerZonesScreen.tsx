import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Polygon } from 'react-native-svg';
import * as Location from 'expo-location';

import { SiteMapView } from '../../components/SiteMapView';
import {
  createDangerZone,
  getDangerZones,
  getSiteMap,
  updateZonePosition,
  updateZoneGps,
  updateZoneMeta,
  parseApiError,
  type MapPoint,
  type SiteMapData,
} from '../../services/api';
import type { DangerZone } from '../../types/actions';
import type { AuthSession } from '../../types/auth';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

type Props = { session: AuthSession };
type ScreenMode = 'list' | 'map' | 'trace';
type RiskLevel = 'Low' | 'Medium' | 'High';

const RISK_DOT_COLOR: Record<string, string> = {
  High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e',
};

function getRiskConfig(isDark: boolean) {
  return {
    High:   { color: '#b42318', bg: isDark ? '#2d0908' : '#fff5f5', border: isDark ? '#5c1512' : '#f5c6c6' },
    Medium: { color: '#a15c00', bg: isDark ? '#271700' : '#fffbeb', border: isDark ? '#4d2e00' : '#fde68a' },
    Low:    { color: '#1f6f5b', bg: isDark ? '#081f17' : '#f0fdf4', border: isDark ? '#154a35' : '#86efac' },
  } as Record<string, { color: string; bg: string; border: string }>;
}

export function SafetyDangerZonesScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);
  const RISK_CONFIG = getRiskConfig(isDark);

  const [screenMode, setScreenMode] = useState<ScreenMode>('list');
  const [zones, setZones]           = useState<DangerZone[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [mapData, setMapData]       = useState<SiteMapData | null>(null);
  const [noMap, setNoMap]           = useState(false);

  const [traceZone, setTraceZone]   = useState<DangerZone | null>(null);
  const [vertices, setVertices]     = useState<MapPoint[]>([]);
  const [imgSize, setImgSize]       = useState({ w: 0, h: 0 });
  const [saving, setSaving]         = useState(false);
  const [traceError, setTraceError] = useState('');

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createZoneName, setCreateZoneName] = useState('');
  const [createZoneRisk, setCreateZoneRisk] = useState<RiskLevel>('Medium');
  const [creating, setCreating] = useState(false);

  // GPS panel state
  const [gpsZoneId, setGpsZoneId]     = useState<number | null>(null);
  const [gpsLat, setGpsLat]           = useState('');
  const [gpsLng, setGpsLng]           = useState('');
  const [gpsRadius, setGpsRadius]     = useState('50');
  const [gpsSaving, setGpsSaving]     = useState(false);
  const [gpsError, setGpsError]       = useState('');
  const [gpsLocating, setGpsLocating] = useState(false);

  // Edit (rename / risk) panel state
  const [editZoneId, setEditZoneId]   = useState<number | null>(null);
  const [editName, setEditName]       = useState('');
  const [editRisk, setEditRisk]       = useState<RiskLevel>('Medium');
  const [editSaving, setEditSaving]   = useState(false);
  const [editError, setEditError]     = useState('');

  function load() {
    return getDangerZones()
      .then(setZones)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    getSiteMap().then(setMapData).catch((e: any) => {
      if (e?.message?.includes('404')) setNoMap(true);
    });
  }, []);

  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function handleCreate() {
    const name = createZoneName.trim();
    if (!name) { Alert.alert('Required', 'Enter a zone name.'); return; }
    setCreating(true);
    try {
      const zone = await createDangerZone({
        actorEmail: session.user.email,
        actorName: session.user.fullName,
        actorRole: session.user.role,
        riskLevel: createZoneRisk,
        site: session.user.assignedSite ?? 'Obuasi Mine',
        zoneName: name,
      });
      setZones(c => [zone, ...c]);
      setShowCreateForm(false);
      setCreateZoneName('');
      setCreateZoneRisk('Medium');
      Alert.alert('Created', `${zone.zoneName} is now active.`);
    } catch { Alert.alert('Failed', 'Could not create danger zone.'); }
    finally { setCreating(false); }
  }

  function openGpsPanel(zone: DangerZone) {
    setEditZoneId(null);
    if (gpsZoneId === zone.id) { setGpsZoneId(null); return; }
    setGpsZoneId(zone.id);
    setGpsLat(zone.latitude != null ? String(zone.latitude) : '');
    setGpsLng(zone.longitude != null ? String(zone.longitude) : '');
    setGpsRadius(zone.radiusMeters != null ? String(zone.radiusMeters) : '50');
    setGpsError('');
  }

  async function useCurrentLocation() {
    setGpsLocating(true);
    setGpsError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setGpsError('Location permission denied.'); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setGpsLat(String(pos.coords.latitude));
      setGpsLng(String(pos.coords.longitude));
    } catch (e: any) {
      setGpsError('Could not get location: ' + (e?.message ?? 'unknown error'));
    } finally {
      setGpsLocating(false);
    }
  }

  async function saveGps(zoneId: number) {
    const lat = parseFloat(gpsLat);
    const lng = parseFloat(gpsLng);
    const radius = parseInt(gpsRadius, 10);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setGpsError('Enter a valid latitude (−90 to 90).');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setGpsError('Enter a valid longitude (−180 to 180).');
      return;
    }
    const safeRadius = isNaN(radius) || radius < 1 ? 50 : radius;
    setGpsSaving(true);
    setGpsError('');
    try {
      const updated = await updateZoneGps(zoneId, lat, lng, safeRadius);
      setZones(zs => zs.map(z => z.id === updated.id ? updated : z));
      setGpsZoneId(null);
      Alert.alert('Saved', 'GPS location saved for this zone.');
    } catch (e: any) {
      setGpsError(parseApiError(e));
    } finally {
      setGpsSaving(false);
    }
  }

  function openEditPanel(zone: DangerZone) {
    setGpsZoneId(null);
    if (editZoneId === zone.id) { setEditZoneId(null); return; }
    setEditZoneId(zone.id);
    setEditName(zone.zoneName);
    setEditRisk((zone.riskLevel as RiskLevel) ?? 'Medium');
    setEditError('');
  }

  async function saveEdit(zoneId: number) {
    const name = editName.trim();
    if (!name) { setEditError('Zone name cannot be empty.'); return; }
    setEditSaving(true);
    setEditError('');
    try {
      const updated = await updateZoneMeta(zoneId, name, editRisk);
      setZones(zs => zs.map(z => z.id === updated.id ? updated : z));
      setEditZoneId(null);
    } catch (e: any) {
      setEditError(parseApiError(e));
    } finally {
      setEditSaving(false);
    }
  }

  function startTrace(zone: DangerZone) {
    if (!mapData) {
      Alert.alert('No map uploaded', 'A supervisor must upload a site map before zones can be traced.');
      return;
    }
    setTraceZone(zone);
    try {
      const existing = zone.polygonPoints ? JSON.parse(zone.polygonPoints) : [];
      setVertices(existing);
    } catch {
      setVertices([]);
    }
    setTraceError('');
    setScreenMode('trace');
  }

  function onImageLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setImgSize({ w: width, h: height });
  }

  function onImageTap(e: any) {
    if (!imgSize.w || !imgSize.h) return;
    const { locationX, locationY } = e.nativeEvent;

    if (vertices.length >= 3) {
      const first = vertices[0];
      const fx = (first.x / 100) * imgSize.w;
      const fy = (first.y / 100) * imgSize.h;
      if (Math.hypot(locationX - fx, locationY - fy) < 20) {
        savePolygon();
        return;
      }
    }

    const xPct = (locationX / imgSize.w) * 100;
    const yPct = (locationY / imgSize.h) * 100;
    setVertices(v => [...v, { x: xPct, y: yPct }]);
  }

  async function savePolygon() {
    if (!traceZone) return;
    if (vertices.length < 3) { setTraceError('Place at least 3 points to define a polygon.'); return; }
    setSaving(true);
    setTraceError('');
    try {
      const updated = await updateZonePosition(traceZone.id, vertices);
      setZones(zs => zs.map(z => z.id === updated.id ? updated : z));
      Alert.alert('Saved', `Zone boundary for "${traceZone.zoneName}" saved.`);
      setScreenMode('list');
    } catch (e) {
      setTraceError(parseApiError(e));
    } finally {
      setSaving(false);
    }
  }

  const active  = zones.filter(z => z.status !== 'Cleared');
  const cleared = zones.filter(z => z.status === 'Cleared');

  // ── TRACE MODE ────────────────────────────────────────────────────────────────
  if (screenMode === 'trace' && traceZone && mapData) {
    const dotColor = RISK_DOT_COLOR[traceZone.riskLevel] ?? '#f59e0b';
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => setScreenMode('list')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Danger Zones</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Trace: {traceZone.zoneName}</Text>
        <Text style={styles.traceSub}>Tap on the map to place each vertex. Tap the first point (highlighted) to close and save the polygon.</Text>

        <View style={styles.imageWrapper} onTouchEnd={onImageTap}>
          <Image
            source={{ uri: `data:image/jpeg;base64,${mapData.imageData}` }}
            style={styles.traceImage}
            resizeMode="contain"
            onLayout={onImageLayout}
          />
          {imgSize.w > 0 && vertices.length > 0 && (
            <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${imgSize.w} ${imgSize.h}`}>
              {vertices.length >= 3 && (
                <Polygon
                  points={vertices.map(p => `${(p.x / 100) * imgSize.w},${(p.y / 100) * imgSize.h}`).join(' ')}
                  fill={dotColor}
                  fillOpacity={0.25}
                  stroke={dotColor}
                  strokeWidth={2}
                />
              )}
              {vertices.map((p, i) => (
                <Circle
                  key={i}
                  cx={(p.x / 100) * imgSize.w}
                  cy={(p.y / 100) * imgSize.h}
                  r={i === 0 ? 10 : 6}
                  fill={i === 0 ? '#fff' : dotColor}
                  stroke={dotColor}
                  strokeWidth={2}
                />
              ))}
            </Svg>
          )}
        </View>

        <Text style={styles.vertexCount}>{vertices.length} point{vertices.length !== 1 ? 's' : ''} placed{vertices.length >= 3 ? ' — tap first point to close' : ''}</Text>

        {traceError ? <Text style={styles.errorText}>{traceError}</Text> : null}

        <View style={styles.traceActions}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setVertices(v => v.slice(0, -1))} disabled={vertices.length === 0}>
            <Text style={styles.secondaryBtnText}>Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setVertices([])}>
            <Text style={styles.secondaryBtnText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryBtn, { flex: 2 }]} onPress={savePolygon} disabled={saving || vertices.length < 3}>
            <Text style={styles.primaryBtnText}>{saving ? 'Saving…' : 'Save Zone'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ── MAP VIEW ──────────────────────────────────────────────────────────────────
  if (screenMode === 'map') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => setScreenMode('list')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Danger Zones</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Site Map</Text>
        <SiteMapView zones={zones} readOnly={false} pollIntervalMs={25000} />
      </ScrollView>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>

      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Danger Zones</Text>
        {active.length > 0 && <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>{active.length} active</Text></View>}
        {mapData && (
          <TouchableOpacity style={styles.mapTabBtn} onPress={() => setScreenMode('map')}>
            <Ionicons name="map-outline" size={14} color="#fff" />
            <Text style={styles.mapTabBtnText}>Map</Text>
          </TouchableOpacity>
        )}
      </View>

      {mapData && <SiteMapView zones={zones} readOnly={false} pollIntervalMs={25000} />}

      {noMap && (
        <View style={styles.noMapHint}>
          <Ionicons name="image-outline" size={15} color={theme.textMuted} />
          <Text style={styles.noMapHintText}>No site map uploaded — ask a supervisor to add one</Text>
        </View>
      )}

      {/* ── Create Zone card ── */}
      <View style={styles.createCard}>
        <TouchableOpacity
          style={styles.createCardHeader}
          onPress={() => { setShowCreateForm(v => !v); setCreateZoneName(''); setCreateZoneRisk('Medium'); }}
          activeOpacity={0.7}
        >
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
            <Ionicons name="warning" size={15} color={theme.danger} />
            <Text style={styles.createTitle}>Create Danger Zone</Text>
          </View>
          <Ionicons name={showCreateForm ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textMuted} />
        </TouchableOpacity>
        <Text style={styles.createSub}>Mark an area as restricted for all site users</Text>

        {showCreateForm && (
          <View style={styles.createForm}>
            <TextInput
              style={styles.createInput}
              placeholder="Zone name, e.g. Blasting Area, Shaft 3"
              placeholderTextColor={theme.textMuted}
              value={createZoneName}
              onChangeText={setCreateZoneName}
              autoCapitalize="words"
              returnKeyType="done"
            />
            <Text style={styles.riskLabel}>Risk level</Text>
            <View style={styles.riskPillRow}>
              {(['Low', 'Medium', 'High'] as RiskLevel[]).map(r => {
                const cfg = RISK_CONFIG[r];
                const isActive = createZoneRisk === r;
                return (
                  <Pressable
                    key={r}
                    style={[styles.riskPillChoice, { borderColor: cfg.color, backgroundColor: isActive ? cfg.color : 'transparent' }]}
                    onPress={() => setCreateZoneRisk(r)}
                  >
                    <Text style={[styles.riskPillChoiceText, { color: isActive ? '#fff' : cfg.color }]}>{r}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.createFormActions}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => { setShowCreateForm(false); setCreateZoneName(''); setCreateZoneRisk('Medium'); }}
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 2, opacity: creating ? 0.6 : 1 }]}
                onPress={handleCreate}
                disabled={creating}
              >
                <Text style={styles.primaryBtnText}>{creating ? 'Creating…' : 'Create Zone'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ── Loading state ── */}
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={theme.accent} />
          <Text style={styles.loadingText}>Loading zones…</Text>
        </View>
      )}

      {!loading && active.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>ACTIVE ZONES</Text>
          {active.map(z => {
            const cfg = RISK_CONFIG[z.riskLevel] ?? RISK_CONFIG['Medium'];
            const hasPolygon = !!z.polygonPoints;
            const hasGps     = z.latitude != null && z.longitude != null;
            const gpsOpen    = gpsZoneId === z.id;
            const editOpen   = editZoneId === z.id;

            return (
              <View key={z.id} style={[styles.zoneCard, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                <View style={styles.zoneTop}>
                  <Text style={styles.zoneName}>{z.zoneName}</Text>
                  <View style={[styles.riskPill, { backgroundColor: cfg.color }]}>
                    <Text style={styles.riskPillText}>{z.riskLevel}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: 4, marginBottom: 6 }}>
                  <Ionicons name="warning" size={12} color={cfg.color} />
                  <Text style={[styles.zoneMeta, { color: cfg.color }]}>Active · {z.site}</Text>
                </View>

                {/* Positioning badges */}
                {(!hasGps || !hasPolygon) && (
                  <View style={styles.badgeRow}>
                    {!hasGps && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="location-outline" size={11} color={styles.missingBadge.color} />
                        <Text style={styles.missingBadge}>No GPS location</Text>
                      </View>
                    )}
                    {!hasPolygon && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="map-outline" size={11} color={styles.missingBadge.color} />
                        <Text style={styles.missingBadge}>Not traced on map</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Action buttons */}
                <View style={styles.zoneBtnRow}>
                  <TouchableOpacity style={styles.traceBtn} onPress={() => startTrace(z)}>
                    <Ionicons name={hasPolygon ? 'pencil-outline' : 'location-outline'} size={12} color={theme.text} />
                    <Text style={styles.traceBtnText}>{hasPolygon ? 'Edit on Map' : 'Trace on Map'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.traceBtn, gpsOpen && styles.traceBtnActive]} onPress={() => openGpsPanel(z)}>
                    <Ionicons name={hasGps ? 'navigate' : 'navigate-outline'} size={12} color={gpsOpen ? '#fff' : theme.text} />
                    <Text style={[styles.traceBtnText, gpsOpen && { color: '#fff' }]}>
                      {hasGps ? 'Edit GPS' : 'Set GPS'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.traceBtn, editOpen && styles.traceBtnActive]} onPress={() => openEditPanel(z)}>
                    <Ionicons name="create-outline" size={12} color={editOpen ? '#fff' : theme.text} />
                    <Text style={[styles.traceBtnText, editOpen && { color: '#fff' }]}>Edit</Text>
                  </TouchableOpacity>
                </View>

                {/* GPS panel */}
                {gpsOpen && (
                  <View style={styles.inlinePanel}>
                    <TouchableOpacity
                      style={[styles.locateBtn, gpsLocating && { opacity: 0.6 }]}
                      onPress={useCurrentLocation}
                      disabled={gpsLocating}
                    >
                      <Ionicons name="locate" size={14} color={theme.accent} />
                      <Text style={styles.locateBtnText}>{gpsLocating ? 'Getting location…' : 'Use My Current Location'}</Text>
                    </TouchableOpacity>
                    <View style={styles.gpsCoordRow}>
                      <TextInput
                        style={[styles.panelInput, { flex: 1 }]}
                        placeholder="Latitude"
                        placeholderTextColor={theme.textMuted}
                        value={gpsLat}
                        onChangeText={setGpsLat}
                        keyboardType="decimal-pad"
                      />
                      <TextInput
                        style={[styles.panelInput, { flex: 1 }]}
                        placeholder="Longitude"
                        placeholderTextColor={theme.textMuted}
                        value={gpsLng}
                        onChangeText={setGpsLng}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <TextInput
                      style={styles.panelInput}
                      placeholder="Radius (m), default 50"
                      placeholderTextColor={theme.textMuted}
                      value={gpsRadius}
                      onChangeText={setGpsRadius}
                      keyboardType="number-pad"
                    />
                    {gpsError ? <Text style={styles.panelError}>{gpsError}</Text> : null}
                    <View style={styles.panelBtnRow}>
                      <TouchableOpacity style={styles.secondaryBtn} onPress={() => setGpsZoneId(null)}>
                        <Text style={styles.secondaryBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.primaryBtn, { flex: 2, opacity: gpsSaving ? 0.6 : 1 }]}
                        onPress={() => saveGps(z.id)}
                        disabled={gpsSaving}
                      >
                        <Text style={styles.primaryBtnText}>{gpsSaving ? 'Saving…' : 'Save Location'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Edit (rename / risk) panel */}
                {editOpen && (
                  <View style={styles.inlinePanel}>
                    <TextInput
                      style={styles.panelInput}
                      placeholder="Zone name"
                      placeholderTextColor={theme.textMuted}
                      value={editName}
                      onChangeText={setEditName}
                      autoCapitalize="words"
                    />
                    <Text style={styles.riskLabel}>Risk level</Text>
                    <View style={styles.riskPillRow}>
                      {(['Low', 'Medium', 'High'] as RiskLevel[]).map(r => {
                        const rc = RISK_CONFIG[r];
                        const isActive = editRisk === r;
                        return (
                          <Pressable
                            key={r}
                            style={[styles.riskPillChoice, { borderColor: rc.color, backgroundColor: isActive ? rc.color : 'transparent' }]}
                            onPress={() => setEditRisk(r)}
                          >
                            <Text style={[styles.riskPillChoiceText, { color: isActive ? '#fff' : rc.color }]}>{r}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {editError ? <Text style={styles.panelError}>{editError}</Text> : null}
                    <View style={styles.panelBtnRow}>
                      <TouchableOpacity style={styles.secondaryBtn} onPress={() => setEditZoneId(null)}>
                        <Text style={styles.secondaryBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.primaryBtn, { flex: 2, opacity: editSaving ? 0.6 : 1 }]}
                        onPress={() => saveEdit(z.id)}
                        disabled={editSaving}
                      >
                        <Text style={styles.primaryBtnText}>{editSaving ? 'Saving…' : 'Save Changes'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </>
      )}

      {!loading && active.length === 0 && (
        <View style={styles.clearCard}>
          <Ionicons name="checkmark-circle" size={22} color={theme.success} />
          <View>
            <Text style={styles.clearTitle}>No active danger zones</Text>
            <Text style={styles.clearSub}>All areas are accessible</Text>
          </View>
        </View>
      )}

      {cleared.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>CLEARED</Text>
          {cleared.map(z => (
            <View key={z.id} style={styles.clearedCard}>
              <Text style={styles.clearedName}>{z.zoneName}</Text>
              <Text style={styles.clearedMeta}>Cleared · {z.site}</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: Theme, isDark: boolean) {
  const cardShadow = {
    shadowColor: '#000' as const,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 4,
    elevation: 2,
  };
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: spacing.xl, paddingBottom: 40 },
    backBtn:     { marginBottom: spacing.md },
    backBtnText: { color: theme.accent, fontSize: 14, fontWeight: '800' },
    pageHeader:   { alignItems: 'center', flexDirection: 'row', marginBottom: spacing.lg, gap: spacing.sm },
    pageTitle:    { ...typography.h1, color: theme.text, flex: 1 },
    activeBadge:  { backgroundColor: theme.amber, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    activeBadgeText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
    mapTabBtn:    { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 8, flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingVertical: 5 },
    mapTabBtnText:{ color: '#fff', fontSize: 12, fontWeight: '800' },

    noMapHint:     { alignItems: 'center', flexDirection: 'row', gap: 8, backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, marginBottom: spacing.lg, padding: spacing.md },
    noMapHintText: { color: theme.textMuted, fontSize: 12, fontWeight: '600', flex: 1 },

    loadingRow:  { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'center', paddingVertical: 32 },
    loadingText: { color: theme.textMuted, fontSize: 13, fontWeight: '700' },

    // Create card
    createCard:       { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.xl, padding: spacing.lg, ...cardShadow },
    createCardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    createTitle:      { ...typography.bodyBold, color: theme.text },
    createSub:        { color: theme.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2, marginBottom: 10 },
    createForm:       { borderTopColor: theme.border, borderTopWidth: 1, paddingTop: spacing.md, gap: spacing.sm },
    createInput:      { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 10 },
    riskLabel:        { color: theme.textMuted, fontSize: 12, fontWeight: '700', marginTop: 2 },
    riskPillRow:      { flexDirection: 'row', gap: spacing.sm },
    riskPillChoice:   { borderRadius: 8, borderWidth: 2, flex: 1, alignItems: 'center', paddingVertical: 8 },
    riskPillChoiceText: { fontSize: 13, fontWeight: '900' },
    createFormActions: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },

    sectionLabel: { ...typography.label, color: theme.textMuted, marginBottom: 10 },
    zoneCard: { borderRadius: 12, borderWidth: 1, marginBottom: 10, padding: 14, ...cardShadow },
    zoneTop:  { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    zoneName: { color: theme.text, flex: 1, fontSize: 14, fontWeight: '900', marginRight: spacing.sm },
    riskPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    riskPillText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
    zoneMeta: { fontSize: 12, fontWeight: '700' },

    badgeRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    missingBadge: { backgroundColor: theme.amberLight, borderColor: theme.amber, borderRadius: 6, borderWidth: 1, color: theme.amber, fontSize: 12, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3 },

    zoneBtnRow:     { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
    traceBtn:       { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: theme.bgInput, borderRadius: 6, flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingVertical: 5 },
    traceBtnText:   { color: theme.text, fontSize: 12, fontWeight: '800' },
    traceBtnActive: { backgroundColor: theme.accent },

    // Inline panels (GPS + Edit share the same visual)
    inlinePanel: { backgroundColor: isDark ? '#111' : '#f8f8f8', borderColor: theme.border, borderRadius: 8, borderWidth: 1, gap: spacing.sm, marginTop: spacing.sm, padding: spacing.md },
    locateBtn:   { alignItems: 'center', flexDirection: 'row', gap: 6 },
    locateBtnText: { color: theme.accent, fontSize: 13, fontWeight: '800' },
    gpsCoordRow: { flexDirection: 'row', gap: spacing.sm },
    panelInput:  { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 13, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 8 },
    panelError:  { color: theme.danger, fontSize: 12, fontWeight: '700' },
    panelBtnRow: { flexDirection: 'row', gap: spacing.sm },

    clearCard: { alignItems: 'center', backgroundColor: theme.successLight, borderColor: theme.success, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, padding: spacing.lg, ...cardShadow },
    clearTitle:{ color: theme.success, fontSize: 14, fontWeight: '900' },
    clearSub:  { color: theme.success, fontSize: 12, fontWeight: '600', marginTop: 2 },
    clearedCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, marginBottom: spacing.sm, opacity: 0.6, padding: 12 },
    clearedName: { color: theme.text, fontSize: 13, fontWeight: '800', marginBottom: 2 },
    clearedMeta: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },

    // Trace mode
    traceSub:      { color: theme.textSub, fontSize: 13, fontWeight: '600', lineHeight: 18, marginBottom: spacing.lg },
    imageWrapper:  { borderRadius: 12, overflow: 'hidden', backgroundColor: '#000', marginBottom: 12 },
    traceImage:    { width: '100%', aspectRatio: 16 / 9 },
    vertexCount:   { color: theme.textSub, fontSize: 12, fontWeight: '700', marginBottom: spacing.sm },
    errorText:     { color: theme.danger, fontSize: 13, fontWeight: '700', marginBottom: spacing.sm },
    traceActions:  { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
    primaryBtn:    { backgroundColor: theme.accent, borderRadius: 10, padding: 13, alignItems: 'center', flex: 1 },
    primaryBtnText:{ color: '#fff', fontSize: 14, fontWeight: '900' },
    secondaryBtn:  { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, padding: 13, alignItems: 'center', flex: 1 },
    secondaryBtnText: { color: theme.text, fontSize: 14, fontWeight: '800' },
  });
}
