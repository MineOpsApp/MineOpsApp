import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme, type Theme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';

type MoreItem = {
  icon: string;
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
  const styles = makeStyles(theme);

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>{title}</Text>
      {sections ? (
        sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionHeader}>{section.title.toUpperCase()}</Text>
            <View style={styles.list}>
              {section.items.map((item, i) => (
                <Pressable
                  key={item.label}
                  onPress={item.onPress}
                  style={[styles.row, i < section.items.length - 1 && styles.rowBorder]}
                >
                  <View style={styles.iconWrap}>
                    <Text style={styles.icon}>{item.icon}</Text>
                  </View>
                  <View style={styles.body}>
                    <Text style={styles.label}>{item.label}</Text>
                    <Text style={styles.description}>{item.description}</Text>
                  </View>
                  <Text style={styles.arrow}>›</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))
      ) : (
        <View style={styles.list}>
          {(items ?? []).map((item, i) => (
            <Pressable
              key={item.label}
              onPress={item.onPress}
              style={[styles.row, i < (items ?? []).length - 1 && styles.rowBorder]}
            >
              <View style={styles.iconWrap}>
                <Text style={styles.icon}>{item.icon}</Text>
              </View>
              <View style={styles.body}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: 20, paddingBottom: 40 },
    pageTitle: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 20 },
    section: { marginBottom: 20 },
    sectionHeader: { color: theme.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
    list: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
    row: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14 },
    rowBorder: { borderBottomColor: theme.bgInput, borderBottomWidth: 1 },
    iconWrap: { alignItems: 'center', backgroundColor: theme.bgInput, borderRadius: 10, height: 40, justifyContent: 'center', marginRight: 14, width: 40 },
    icon: { fontSize: 20 },
    body: { flex: 1 },
    label: { color: theme.text, fontSize: 15, fontWeight: '800', marginBottom: 2 },
    description: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
    arrow: { color: theme.textMuted, fontSize: 22 },
  });
}
