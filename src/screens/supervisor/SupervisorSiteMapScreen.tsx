import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { getSiteMap, uploadSiteMap, parseApiError, type SiteMapData } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

export function SupervisorSiteMapScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const s = makeStyles(theme);

  const [current, setCurrent] = useState<SiteMapData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    getSiteMap()
      .then(setCurrent)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function pickAndUpload() {
    setError('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow photo library access to pick a map image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]?.base64) return;

    const b64 = result.assets[0].base64;
    if (b64.length > 2_000_000) {
      setError('Image is too large. Choose a smaller or lower-quality image (under ~1.5 MB).');
      return;
    }

    setUploading(true);
    try {
      const saved = await uploadSiteMap(b64);
      setCurrent(saved);
      Alert.alert('Uploaded', 'Site map updated successfully.');
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return <View style={s.centered}><ActivityIndicator color={theme.accent} size="large" /></View>;
  }

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Text style={s.pageTitle}>Site Map</Text>
      <Text style={s.pageSub}>Upload a floor plan or aerial image. Safety officers can then trace danger zone boundaries onto it.</Text>

      {current ? (
        <View style={s.card}>
          <Text style={s.cardLabel}>Current map</Text>
          <Text style={s.cardValue}>Uploaded by {current.uploadedBy}</Text>
          <Text style={s.cardValue}>{new Date(current.uploadedAt).toLocaleString()}</Text>
        </View>
      ) : (
        <View style={s.emptyCard}>
          <Text style={s.emptyIcon}>🗺</Text>
          <Text style={s.emptyText}>No map uploaded yet</Text>
          <Text style={s.emptySub}>Upload a site plan so danger zones can be traced visually.</Text>
        </View>
      )}

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      <TouchableOpacity style={s.primaryBtn} onPress={pickAndUpload} disabled={uploading}>
        <Text style={s.primaryBtnText}>
          {uploading ? 'Uploading…' : current ? 'Replace Map Image' : 'Upload Map Image'}
        </Text>
      </TouchableOpacity>

      <View style={s.hintCard}>
        <Text style={s.hintText}>💡 After uploading, go to Danger Zones (Safety Officer screen) to trace zone boundaries on the map.</Text>
      </View>
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg },
    container: { backgroundColor: theme.bg, padding: 20, paddingBottom: 48 },
    pageTitle: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 2 },
    pageSub:   { color: theme.textSub, fontSize: 13, fontWeight: '600', marginBottom: 20, lineHeight: 19 },
    card:      { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: 16, padding: 16 },
    cardLabel: { color: theme.textSub, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 6 },
    cardValue: { color: theme.text, fontSize: 13, fontWeight: '700', marginBottom: 2 },
    emptyCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, alignItems: 'center', padding: 28, marginBottom: 16 },
    emptyIcon: { fontSize: 32, marginBottom: 8 },
    emptyText: { color: theme.text, fontSize: 15, fontWeight: '800', marginBottom: 4 },
    emptySub:  { color: theme.textSub, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    primaryBtn:     { backgroundColor: theme.accent, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 16 },
    primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
    errorText: { color: theme.danger, fontSize: 13, fontWeight: '700', marginBottom: 10 },
    hintCard: { backgroundColor: theme.amberLight, borderColor: theme.amber, borderRadius: 10, borderWidth: 1, padding: 12 },
    hintText: { color: theme.amber, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  });
}
