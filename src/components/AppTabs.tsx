import { Pressable, StyleSheet, Text, View } from 'react-native';

export type TabName = 'dashboard' | 'sites' | 'roles';

type AppTabsProps = {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
};

const tabs: { label: string; value: TabName }[] = [
  { label: 'Dashboard', value: 'dashboard' },
  { label: 'Sites', value: 'sites' },
  { label: 'Roles', value: 'roles' },
];

export function AppTabs({ activeTab, onTabChange }: AppTabsProps) {
  return (
    <View style={styles.tabs}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={tab.value}
            onPress={() => onTabChange(tab.value)}
            style={[styles.tab, isActive && styles.activeTab]}
          >
            <Text style={[styles.tabText, isActive && styles.activeTabText]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    backgroundColor: '#edf1f5',
    borderRadius: 8,
    flexDirection: 'row',
    padding: 4,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
  },
  activeTab: {
    backgroundColor: '#ffffff',
  },
  tabText: {
    color: '#5d6875',
    fontSize: 14,
    fontWeight: '800',
  },
  activeTabText: {
    color: '#1f6f5b',
  },
});
