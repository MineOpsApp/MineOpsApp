import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Polygon, Text as SvgText } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { getSiteMap, getZoneDetail, type MapPoint, type SiteMapData, type ZoneDetail } from '../services/api';
import { useTheme, type Theme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import type { DangerZone } from '../types/actions';

type Props = {
  zones: DangerZone[];
  readOnly?: boolean;
  onZoneDetail?: (detail: ZoneDetail, zone: DangerZone) => void;
  pollIntervalMs?: number;
};

// Category color map — stays fixed regardless of theme
const RISK_COLOR: Record<string, string> = {
  High:   '#ef4444',
  Medium: '#f59e0b',
  Low:    '#22c55e',
};

const RISK_FILL_OPACITY = 0.3;

function parsePoints(raw: string | null | undefined): MapPoint[] | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function pointsToSvgString(points: MapPoint[], w: number, h: number): string {
  return points.map(p => `${(p.x / 100) * w},${(p.y / 100) * h}`).join(' ');
}

function pointInPolygon(px: number, py: number, poly: MapPoint[], w: number, h: number): boolean {
  let inside = false;
  const pts = poly.map(p => ({ x: (p.x / 100) * w, y: (p.y / 100) * h }));
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y;
    const xj = pts[j].x, yj = pts[j].y;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function centroid(points: MapPoint[]): { x: number; y: number } {
  const sx = points.reduce((a, p) => a + p.x, 0) / points.length;
  const sy = points.reduce((a, p) => a + p.y, 0) / points.length;
  return { x: sx, y: sy };
}

export function SiteMapView({ zones, readOnly = true, onZoneDetail, pollIntervalMs = 25000 }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const s = makeStyles(theme);

  const [mapData, setMapData]   = useState<SiteMapData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [noMap, setNoMap]       = useState(false);
  const [imgSize, setImgSize]   = useState({ w: 0, h: 0 });
  const [selected, setSelected] = useState<DangerZone | null>(null);
  const [detail, setDetail]     = useState<ZoneDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMap = useCallback(async () => {
    try {
      const data = await getSiteMap();
      setMapData(data);
      setNoMap(false);
    } catch (e: any) {
      if (e?.message?.includes('404')) setNoMap(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMap();
    intervalRef.current = setInterval(loadMap, pollIntervalMs);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadMap, pollIntervalMs]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setImgSize({ w: width, h: height });
  };

  const handleTap = async (e: any) => {
    if (!imgSize.w || !imgSize.h) return;
    const { locationX, locationY } = e.nativeEvent;

    const tapped = zones.find(z => {
      const pts = parsePoints(z.polygonPoints);
      if (!pts || pts.length < 3) return false;
      return pointInPolygon(locationX, locationY, pts, imgSize.w, imgSize.h);
    });

    if (!tapped) { setSelected(null); setDetail(null); return; }
    setSelected(tapped);
    setDetail(null);
    setDetailLoading(true);
    try {
      const d = await getZoneDetail(tapped.id);
      setDetail(d);
      onZoneDetail?.(d, tapped);
    } catch {} finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return <View style={s.placeholder}><ActivityIndicator color={theme.accent} /></View>;
  }

  if (noMap || !mapData) {
    return (
      <View style={s.placeholder}>
        <Ionicons name="map-outline" size={32} color={theme.textMuted} style={s.placeholderIcon} />
        <Text style={s.placeholderText}>No site map uploaded yet</Text>
        {!readOnly && <Text style={s.placeholderSub}>Upload one from the More menu → Site Map</Text>}
      </View>
    );
  }

  const mappedZones = zones.filter(z => parsePoints(z.polygonPoints) !== null);

  return (
    <View style={s.root}>
      <View style={s.mapContainer} onTouchEnd={handleTap}>
        <Image
          source={{ uri: `data:image/jpeg;base64,${mapData.imageData}` }}
          style={s.image}
          resizeMode="contain"
          onLayout={onLayout}
        />
        {imgSize.w > 0 && (
          <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${imgSize.w} ${imgSize.h}`}>
            {mappedZones.map(z => {
              const pts = parsePoints(z.polygonPoints)!;
              const color = RISK_COLOR[z.riskLevel] ?? '#f59e0b';
              const isSelected = selected?.id === z.id;
              return (
                <Polygon
                  key={z.id}
                  points={pointsToSvgString(pts, imgSize.w, imgSize.h)}
                  fill={color}
                  fillOpacity={isSelected ? 0.5 : RISK_FILL_OPACITY}
                  stroke={color}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
              );
            })}
            {mappedZones.map(z => {
              const pts = parsePoints(z.polygonPoints)!;
              const c = centroid(pts);
              return (
                <SvgText
                  key={`lbl-${z.id}`}
                  x={(c.x / 100) * imgSize.w}
                  y={(c.y / 100) * imgSize.h}
                  fontSize="10"
                  fill="#fff"
                  fontWeight="bold"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                >
                  {z.zoneName}
                </SvgText>
              );
            })}
          </Svg>
        )}
      </View>

      {/* Zone detail popover */}
      {selected && (
        <View style={s.detailCard}>
          <View style={s.detailHeader}>
            <View style={[s.riskDot, { backgroundColor: RISK_COLOR[selected.riskLevel] ?? '#f59e0b' }]} />
            <Text style={s.detailZoneName}>{selected.zoneName}</Text>
            <TouchableOpacity onPress={() => { setSelected(null); setDetail(null); }} style={s.closeBtn}>
              <Ionicons name="close" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {detailLoading ? (
            <ActivityIndicator color={theme.accent} style={{ marginVertical: 8 }} />
          ) : detail ? (
            <>
              <Text style={s.detailStat}>
                {detail.openHazards.length} open hazard{detail.openHazards.length !== 1 ? 's' : ''}
                {'  ·  '}
                {detail.scheduledBlasts.length} scheduled blast{detail.scheduledBlasts.length !== 1 ? 's' : ''}
              </Text>
              {detail.openHazards.slice(0, 3).map((h: any) => (
                <View key={h.id} style={s.hazardRow}>
                  <Text style={s.hazardSev}>{h.severity ?? 'Medium'}</Text>
                  <Text style={s.hazardType} numberOfLines={1}>{h.hazardType}</Text>
                </View>
              ))}
              {detail.scheduledBlasts.slice(0, 2).map((b: any) => (
                <View key={b.id} style={s.blastRow}>
                  <View style={{ alignItems: 'center', flexDirection: 'row', gap: 5 }}>
                    <MaterialCommunityIcons name="bomb" size={13} color={theme.text} />
                    <Text style={s.blastLabel}>Blast scheduled</Text>
                  </View>
                  <Text style={s.blastTime}>{new Date(b.blastTime).toLocaleString()}</Text>
                </View>
              ))}
            </>
          ) : null}
        </View>
      )}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    root:         { marginBottom: 12 },
    mapContainer: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#000', minHeight: 200 },
    image:        { width: '100%', aspectRatio: 16 / 9 },
    placeholder:  { alignItems: 'center', backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 120, padding: 24 },
    placeholderIcon: { fontSize: 30, marginBottom: 6 },
    placeholderText: { color: theme.text, fontSize: 14, fontWeight: '800' },
    placeholderSub:  { color: theme.textSub, fontSize: 12, fontWeight: '600', marginTop: 4, textAlign: 'center' },

    detailCard:   { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginTop: 8, padding: 14 },
    detailHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 8 },
    riskDot:      { borderRadius: 6, height: 12, marginRight: 8, width: 12 },
    detailZoneName: { color: theme.text, flex: 1, fontSize: 14, fontWeight: '900' },
    closeBtn:     { paddingLeft: 8 },
    closeBtnText: { color: theme.textSub, fontSize: 14, fontWeight: '800' },
    detailStat:   { color: theme.textSub, fontSize: 12, fontWeight: '700', marginBottom: 8 },

    hazardRow: { alignItems: 'center', borderTopColor: theme.bgInput, borderTopWidth: 1, flexDirection: 'row', gap: 8, paddingVertical: 4 },
    hazardSev: { color: theme.danger, fontSize: 11, fontWeight: '800', minWidth: 52 },
    hazardType:{ color: theme.text, flex: 1, fontSize: 12, fontWeight: '700' },

    blastRow:  { alignItems: 'center', borderTopColor: theme.bgInput, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    blastLabel:{ color: theme.amber, fontSize: 12, fontWeight: '800' },
    blastTime: { color: theme.textSub, fontSize: 11, fontWeight: '700' },
  });
}
