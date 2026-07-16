import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useTheme, spacing, typography, type Theme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';

type IconSpec =
  | { lib: 'ionicons'; name: ComponentProps<typeof Ionicons>['name'] }
  | { lib: 'material'; name: ComponentProps<typeof MaterialCommunityIcons>['name'] };

const EMOJI_ICONS: Record<string, IconSpec> = {
  '📋': { lib: 'ionicons', name: 'clipboard-outline' },
  '🔄': { lib: 'ionicons', name: 'swap-horizontal-outline' },
  '⛏': { lib: 'ionicons', name: 'construct-outline' },
  '🕐': { lib: 'ionicons', name: 'time-outline' },
  '🚨': { lib: 'ionicons', name: 'alert-circle-outline' },
  '✅': { lib: 'ionicons', name: 'checkmark-circle-outline' },
  '🛡': { lib: 'ionicons', name: 'shield-checkmark-outline' },
  '💬': { lib: 'ionicons', name: 'chatbubble-ellipses-outline' },
  '🌐': { lib: 'ionicons', name: 'globe-outline' },
  '🔑': { lib: 'ionicons', name: 'key-outline' },
  '👤': { lib: 'ionicons', name: 'person-outline' },
  '🎟': { lib: 'ionicons', name: 'qr-code-outline' },
  '🏭': { lib: 'ionicons', name: 'business-outline' },
  '🗺': { lib: 'ionicons', name: 'map-outline' },
  '👷': { lib: 'ionicons', name: 'people-outline' },
  '📞': { lib: 'ionicons', name: 'call-outline' },
  '🧠': { lib: 'ionicons', name: 'analytics-outline' },
  '🩺': { lib: 'ionicons', name: 'medkit-outline' },
  '🎓': { lib: 'material', name: 'certificate-outline' },
  '🔍': { lib: 'ionicons', name: 'search-outline' },
  '🔧': { lib: 'ionicons', name: 'build-outline' },
  '💥': { lib: 'ionicons', name: 'flame-outline' },
  '📢': { lib: 'ionicons', name: 'megaphone-outline' },
  '💰': { lib: 'ionicons', name: 'cash-outline' },
  '💳': { lib: 'ionicons', name: 'card-outline' },
  '🤝': { lib: 'ionicons', name: 'pricetag-outline' },
  '📦': { lib: 'ionicons', name: 'cube-outline' },
  '🚑': { lib: 'ionicons', name: 'medkit-outline' },
  '🛒': { lib: 'ionicons', name: 'storefront-outline' },
  '📊': { lib: 'ionicons', name: 'bar-chart-outline' },
  '🔐': { lib: 'ionicons', name: 'person-add-outline' },
};

function RowIcon({ emoji, color }: { emoji: string | IconSpec; color: string }) {
  const spec: IconSpec | undefined = typeof emoji === 'object' ? emoji : EMOJI_ICONS[emoji];
  if (!spec) return <Text style={{ fontSize: 18 }}>{emoji as string}</Text>;
  if (spec.lib === 'ionicons') return <Ionicons name={spec.name} size={20} color={color} />;
  return <MaterialCommunityIcons name={spec.name as ComponentProps<typeof MaterialCommunityIcons>['name']} size={20} color={color} />;
}

type MoreItem = {
  icon: string | IconSpec;
  label: string;
  description: string;
  onPress: () => void;
};

type MoreSection = {
  title: string;
  items: MoreItem[];
};

type Props = {
  items?: MoreItem[];
  sections?: MoreSection[];
  title?: string;
};

export function MoreScreen({ items, sections, title = 'More' }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

  const renderRow = (item: MoreItem, i: number, total: number) => (
    <Pressable
      key={item.label}
      onPress={item.onPress}
      style={[styles.row, i < total - 1 && styles.rowBorder]}
    >
      <View style={styles.iconWrap}>
        <RowIcon emoji={item.icon} color={theme.accent} />
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>{item.label}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.pageTitleRow}>
        <View style={styles.pageTitleAccent} />
        <Text style={styles.pageTitle}>{title}</Text>
      </View>
      {sections ? (
        sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionHeader}>{section.title.toUpperCase()}</Text>
            </View>
            <View style={styles.list}>
              {section.items.map((item, i) => renderRow(item, i, section.items.length))}
            </View>
          </View>
        ))
      ) : (
        <View style={styles.list}>
          {(items ?? []).map((item, i) => renderRow(item, i, (items ?? []).length))}
        </View>
      )}
    </ScrollView>
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
    pageTitleRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xxl },
    pageTitleAccent: { backgroundColor: theme.accent, borderRadius: 2, height: 24, width: 4 },
    pageTitle: { ...typography.h1, color: theme.text },
    section: { marginBottom: spacing.xl },
    sectionHeaderRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginBottom: spacing.sm, marginLeft: spacing.xs },
    sectionDot: { backgroundColor: theme.accent, borderRadius: 3, height: 6, width: 6 },
    sectionHeader: { ...typography.label, color: theme.textMuted },
    list: { backgroundColor: theme.bgCard, borderRadius: 14, overflow: 'hidden', ...cardShadow },
    row: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: 14 },
    rowBorder: { borderBottomColor: theme.bgInput, borderBottomWidth: 1 },
    iconWrap: { alignItems: 'center', backgroundColor: theme.bgInput, borderRadius: 10, height: 40, justifyContent: 'center', marginRight: 14, width: 40 },
    body: { flex: 1 },
    label: { ...typography.bodyBold, color: theme.text, marginBottom: 2 },
    description: { ...typography.caption, color: theme.textMuted },
    arrow: { color: theme.textMuted, fontSize: 22 },
  });
}
