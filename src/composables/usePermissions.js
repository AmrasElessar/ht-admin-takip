// Yetki Sistemi Composable
// DOSYA: src/composables/usePermissions.js

import { computed } from 'vue'
import { useUserStore } from '@/stores/userStore'

export function usePermissions() {
  const userStore = useUserStore()

  // User role checks
  const isFounder = computed(() => userStore.currentUserRole === 'kurucu')
  const isSuperAdmin = computed(() => userStore.currentUserRole === 'superadmin')
  const isUser = computed(() => userStore.currentUserRole === 'kullanici')
  const isAdmin = computed(() => isFounder.value || isSuperAdmin.value)

  // Permission checks
  const permissions = computed(() => ({
    // User Management
    canViewAllUsers: isFounder.value || isSuperAdmin.value,
    canCreateUsers: isFounder.value,
    canDeleteUsers: isFounder.value,
    canAssignFacilities: isFounder.value || isSuperAdmin.value,
    canEditOwnFacilityAssignment: isFounder.value, // Super admin can't edit own

    // Facility Management
    canViewFacilities: true, // All can view assigned facilities
    canCreateFacilities: isFounder.value,
    canEditFacilities: isFounder.value,
    canDeleteFacilities: isFounder.value,

    // Teams Management
    canViewTeams: true, // All can view teams in assigned facilities
    canCreateTeams: isFounder.value || isSuperAdmin.value,
    canEditTeams: isFounder.value || isSuperAdmin.value,
    canDeleteTeams: isFounder.value,

    // Sales Groups Management
    canViewSalesGroups: true, // All can view
    canCreateSalesGroups: isFounder.value,
    canEditSalesGroups: isFounder.value || isSuperAdmin.value,
    canDeleteSalesGroups: isFounder.value,

    // Data Entry
    canEnterData: true, // All can enter data for assigned facilities
    canViewReports: true, // All can view reports for assigned facilities

    // System Settings
    canViewSystemSettings: true, // All can view (for UI)
    canEditSystemSettings: isFounder.value,
    canEditAnnouncements: isFounder.value,
    canEditWhatsAppTemplates: isFounder.value,
    canResetSystem: isFounder.value,

    // Profile Settings
    canEditOwnProfile: true, // All can edit own profile
    canEditProfileStatus: true, // All can edit own status
    canViewOtherProfiles: isFounder.value || isSuperAdmin.value,

    // Navigation Access
    canAccessSettings: isFounder.value || isSuperAdmin.value,
    canAccessUserManagement: isFounder.value || isSuperAdmin.value,
    canAccessSystemReset: isFounder.value,
  }))

  return {
    isFounder,
    isSuperAdmin,
    isUser,
    isAdmin,
    permissions,
  }
}
