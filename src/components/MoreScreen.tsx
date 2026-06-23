import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type MoreItem = {
  icon: string;
  label: string;
  description: string;
  onPress: () => void;
};

type Props = {
  items: MoreItem[];
  title?: string;
};

export function MoreScreen({ items, title = 'More' }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>{title}</Text>
      <View style={styles.list}>
        {items.map((item, i) => (
          <Pressable
            key={item.label}
            onPress={item.onPress}
            style={[styles.row, i < items.length - 1 && styles.rowBorder]}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f0f2f5', padding: 20, paddingBottom: 40 },
  pageTitle: { color: '#17212b', fontSize: 22, fontWeight: '900', marginBottom: 20 },
  list: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  row: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder: { borderBottomColor: '#f4f6f8', borderBottomWidth: 1 },
  iconWrap: { alignItems: 'center', backgroundColor: '#f4f6f8', borderRadius: 10, height: 40, justifyContent: 'center', marginRight: 14, width: 40 },
  icon: { fontSize: 20 },
  body: { flex: 1 },
  label: { color: '#17212b', fontSize: 15, fontWeight: '800', marginBottom: 2 },
  description: { color: '#8fa3b8', fontSize: 12, fontWeight: '600' },
  arrow: { color: '#8fa3b8', fontSize: 22 },
});
