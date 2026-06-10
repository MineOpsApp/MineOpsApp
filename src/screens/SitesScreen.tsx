import { StyleSheet, Text, View } from 'react-native';

import type { Site } from '../types/site';

type SitesScreenProps = {
  sites: Site[];
  message: string;
};

export function SitesScreen({ sites, message }: SitesScreenProps) {
  return (
    <>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Network</Text>
        <Text style={styles.title}>Sites</Text>
        <Text style={styles.subtitle}>Mining locations currently tracked in MineOps</Text>
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {sites.map((site) => (
        <View key={site.name} style={styles.siteCard}>
          <View style={styles.siteInfo}>
            <Text style={styles.siteName}>{site.name}</Text>
            <Text style={styles.siteMeta}>Operational site</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{site.status}</Text>
          </View>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  eyebrow: {
    color: '#1f6f5b',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: '#17212b',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 6,
  },
  subtitle: {
    color: '#5d6875',
    fontSize: 16,
    lineHeight: 22,
    marginTop: 8,
  },
  message: {
    color: '#5d6875',
    fontSize: 16,
    marginBottom: 16,
  },
  siteCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#dde3ea',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    minHeight: 78,
    padding: 14,
  },
  siteInfo: {
    flex: 1,
    paddingRight: 12,
  },
  siteName: {
    color: '#17212b',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
  siteMeta: {
    color: '#5d6875',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: '#e7f6ef',
    borderRadius: 8,
    minWidth: 88,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statusBadgeText: {
    color: '#1f7a4d',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
});
