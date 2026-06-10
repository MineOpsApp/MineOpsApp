import { Pressable, StyleSheet, Text, View } from 'react-native';

import { roleDefinitions } from '../data/roles';
import type { UserRole } from '../types/role';

type RolesScreenProps = {
  selectedRole: UserRole;
  onRoleChange: (role: UserRole) => void;
};

export function RolesScreen({ selectedRole, onRoleChange }: RolesScreenProps) {
  const role = roleDefinitions.find((item) => item.id === selectedRole) ?? roleDefinitions[0];

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Access planning</Text>
        <Text style={styles.title}>User Roles</Text>
        <Text style={styles.subtitle}>Preview what each MineOps role can access before login is added</Text>
      </View>

      <View style={styles.roleGrid}>
        {roleDefinitions.map((item) => {
          const isActive = item.id === selectedRole;

          return (
            <Pressable
              accessibilityRole="button"
              key={item.id}
              onPress={() => onRoleChange(item.id)}
              style={[styles.roleButton, isActive && styles.activeRoleButton]}
            >
              <Text style={[styles.roleButtonText, isActive && styles.activeRoleButtonText]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.roleCard}>
        <Text style={styles.roleTitle}>{role.label}</Text>
        <Text style={styles.roleSummary}>{role.summary}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permissions</Text>
        {role.permissions.map((permission) => (
          <View key={permission.label} style={styles.permissionRow}>
            <Text style={styles.permissionLabel}>{permission.label}</Text>
            <View
              style={[
                styles.permissionBadge,
                permission.allowed ? styles.allowedBadge : styles.blockedBadge,
              ]}
            >
              <Text
                style={[
                  styles.permissionBadgeText,
                  permission.allowed ? styles.allowedBadgeText : styles.blockedBadgeText,
                ]}
              >
                {permission.allowed ? 'Allowed' : 'Blocked'}
              </Text>
            </View>
          </View>
        ))}
      </View>
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
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  roleButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#dde3ea',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    width: '48%',
  },
  activeRoleButton: {
    backgroundColor: '#e7f6ef',
    borderColor: '#1f6f5b',
  },
  roleButtonText: {
    color: '#5d6875',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  activeRoleButtonText: {
    color: '#1f6f5b',
  },
  roleCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dde3ea',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 22,
    padding: 16,
  },
  roleTitle: {
    color: '#17212b',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
  },
  roleSummary: {
    color: '#5d6875',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    color: '#17212b',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  permissionRow: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#dde3ea',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    minHeight: 62,
    padding: 12,
  },
  permissionLabel: {
    color: '#17212b',
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    paddingRight: 10,
  },
  permissionBadge: {
    borderRadius: 8,
    minWidth: 78,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  allowedBadge: {
    backgroundColor: '#e7f6ef',
  },
  blockedBadge: {
    backgroundColor: '#fdeceb',
  },
  permissionBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  allowedBadgeText: {
    color: '#1f7a4d',
  },
  blockedBadgeText: {
    color: '#b42318',
  },
});
