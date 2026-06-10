import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { roleDefinitions } from '../data/roles';
import type { UserRole } from '../types/role';

type RolesScreenProps = {
  selectedRole: UserRole;
  onRoleChange: (role: UserRole) => void;
};

export function RolesScreen({ selectedRole, onRoleChange }: RolesScreenProps) {
  const [activeSubtab, setActiveSubtab] = useState<'overview' | 'auditLog'>('overview');
  const role = roleDefinitions.find((item) => item.id === selectedRole) ?? roleDefinitions[0];
  const canViewAuditLog = role.auditLogAccess;

  function changeRole(roleId: UserRole) {
    onRoleChange(roleId);
    setActiveSubtab('overview');
  }

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
              onPress={() => changeRole(item.id)}
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

      <View style={styles.subtabs}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeSubtab === 'overview' }}
          onPress={() => setActiveSubtab('overview')}
          style={[styles.subtab, activeSubtab === 'overview' && styles.activeSubtab]}
        >
          <Text style={[styles.subtabText, activeSubtab === 'overview' && styles.activeSubtabText]}>
            Overview
          </Text>
        </Pressable>

        {canViewAuditLog ? (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeSubtab === 'auditLog' }}
            onPress={() => setActiveSubtab('auditLog')}
            style={[styles.subtab, activeSubtab === 'auditLog' && styles.activeSubtab]}
          >
            <Text style={[styles.subtabText, activeSubtab === 'auditLog' && styles.activeSubtabText]}>
              Audit Log
            </Text>
          </Pressable>
        ) : null}
      </View>

      {activeSubtab === 'overview' ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Responsibilities</Text>
            {role.responsibilities.map((responsibility) => (
              <View key={responsibility} style={styles.responsibilityRow}>
                <Text style={styles.responsibilityBullet}>•</Text>
                <Text style={styles.responsibilityText}>{responsibility}</Text>
              </View>
            ))}
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
      ) : (
        <View style={styles.auditCard}>
          <Text style={styles.auditTitle}>Audit Log Access</Text>
          <Text style={styles.auditText}>
            {role.label} can review operational changes, report approvals, safety actions, SOS responses,
            and plan updates. Editing audit history will stay blocked; this area is for traceability.
          </Text>
          <View style={styles.auditItem}>
            <Text style={styles.auditItemTitle}>Plan change recorded</Text>
            <Text style={styles.auditItemMeta}>Today • Site operations</Text>
          </View>
          <View style={styles.auditItem}>
            <Text style={styles.auditItemTitle}>Inspection approval reviewed</Text>
            <Text style={styles.auditItemMeta}>Today • Compliance trail</Text>
          </View>
          <View style={styles.auditItem}>
            <Text style={styles.auditItemTitle}>SOS response acknowledged</Text>
            <Text style={styles.auditItemMeta}>Today • Emergency action</Text>
          </View>
        </View>
      )}
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
  subtabs: {
    backgroundColor: '#edf1f5',
    borderRadius: 8,
    flexDirection: 'row',
    marginBottom: 18,
    padding: 4,
  },
  subtab: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
  },
  activeSubtab: {
    backgroundColor: '#ffffff',
  },
  subtabText: {
    color: '#5d6875',
    fontSize: 14,
    fontWeight: '800',
  },
  activeSubtabText: {
    color: '#1f6f5b',
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
  responsibilityRow: {
    backgroundColor: '#ffffff',
    borderColor: '#dde3ea',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 12,
  },
  responsibilityBullet: {
    color: '#1f6f5b',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
    paddingRight: 8,
  },
  responsibilityText: {
    color: '#17212b',
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
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
  auditCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dde3ea',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 22,
    padding: 16,
  },
  auditTitle: {
    color: '#17212b',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  auditText: {
    color: '#5d6875',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
    marginBottom: 14,
  },
  auditItem: {
    borderTopColor: '#dde3ea',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 12,
  },
  auditItemTitle: {
    color: '#17212b',
    fontSize: 15,
    fontWeight: '800',
  },
  auditItemMeta: {
    color: '#5d6875',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
});
