// Browser Console Test Runner
// DOSYA: src/utils/browserTestRunner.js
// Bu dosyayı main.js'e import edip console'dan test edebilirsiniz

export class PermissionTester {
  constructor() {
    this.results = []
    this.currentUser = null
  }

  // Mock kullanıcı oluştur
  mockUser(role, assignedFacilityIds = ['tesis1']) {
    // useUserStore'u simüle et
    this.currentUser = {
      role,
      assignedFacilityIds,
      displayName: `Test ${role}`,
      id: 'test-123',
    }

    console.log(`🧪 Mock User Created: ${role}`)
    return this.currentUser
  }

  // Yetki kontrolü simülasyonu
  checkPermissions(role) {
    const permissions = this.calculatePermissions(role)

    console.group(`🔐 Permission Check: ${role}`)

    // Navigation permissions
    const navItems = this.getVisibleNavItems(permissions)
    console.log(`📋 Visible Navigation Items: ${navItems.length}/8`)
    console.table(navItems)

    // Critical permissions
    console.log('🚨 Critical Permissions:')
    console.table({
      'Delete Users': permissions.canDeleteUsers,
      'Create Facilities': permissions.canCreateFacilities,
      'Reset System': permissions.canResetSystem,
      'Edit Own Facility': permissions.canEditOwnFacilityAssignment,
    })

    console.groupEnd()

    return {
      role,
      navItemCount: navItems.length,
      permissions,
      navItems,
    }
  }

  // Yetki hesaplama (usePermissions.js mantığı)
  calculatePermissions(role) {
    const isFounder = role === 'kurucu'
    const isSuperAdmin = role === 'superadmin'

    return {
      // User Management
      canViewAllUsers: isFounder || isSuperAdmin,
      canCreateUsers: isFounder,
      canDeleteUsers: isFounder,
      canAssignFacilities: isFounder || isSuperAdmin,
      canEditOwnFacilityAssignment: isFounder,

      // Facility Management
      canViewFacilities: true,
      canCreateFacilities: isFounder,
      canEditFacilities: isFounder,
      canDeleteFacilities: isFounder,

      // Teams Management
      canViewTeams: true,
      canCreateTeams: isFounder || isSuperAdmin,
      canEditTeams: isFounder || isSuperAdmin,
      canDeleteTeams: isFounder,

      // Sales Groups Management
      canViewSalesGroups: true,
      canCreateSalesGroups: isFounder,
      canEditSalesGroups: isFounder || isSuperAdmin,
      canDeleteSalesGroups: isFounder,

      // Data Entry
      canEnterData: true,
      canViewReports: true,

      // System Settings
      canViewSystemSettings: true,
      canEditSystemSettings: isFounder,
      canEditAnnouncements: isFounder,
      canEditWhatsAppTemplates: isFounder,
      canResetSystem: isFounder,

      // Profile Settings
      canEditOwnProfile: true,
      canEditProfileStatus: true,
      canViewOtherProfiles: isFounder || isSuperAdmin,

      // Navigation Access
      canAccessSettings: isFounder || isSuperAdmin,
      canAccessUserManagement: isFounder || isSuperAdmin,
      canAccessSystemReset: isFounder,
    }
  }

  // Görünür navigasyon öğelerini hesapla
  getVisibleNavItems(permissions) {
    const allNavItems = [
      { name: 'Profilim', condition: permissions.canEditOwnProfile },
      { name: 'Kullanıcı Yönetimi', condition: permissions.canAccessUserManagement },
      { name: 'Tesis Yönetimi', condition: permissions.canEditFacilities },
      { name: 'Grup Yönetimi', condition: permissions.canEditSalesGroups },
      { name: 'Ekip Yönetimi', condition: permissions.canEditTeams },
      { name: 'Duyuru Yönetimi', condition: permissions.canEditAnnouncements },
      { name: 'WhatsApp Şablonu', condition: permissions.canEditWhatsAppTemplates },
      { name: 'Sistem Sıfırla', condition: permissions.canResetSystem },
    ]

    return allNavItems.filter((item) => item.condition).map((item) => ({ 'Menu Item': item.name }))
  }

  // Tüm rolleri test et
  testAllRoles() {
    console.log('🚀 Starting Full Permission Test Suite...')
    console.log('=' * 50)

    const roles = ['kullanici', 'superadmin', 'kurucu']
    const results = []

    roles.forEach((role) => {
      const result = this.checkPermissions(role)
      results.push(result)
    })

    // Özet tablo
    console.log('\n📊 Test Results Summary:')
    console.table(
      results.map((r) => ({
        Role: r.role,
        'Navigation Items': r.navItemCount,
        'Can Delete Users': r.permissions.canDeleteUsers ? '✅' : '❌',
        'Can Reset System': r.permissions.canResetSystem ? '✅' : '❌',
        'Can Edit Own Facility': r.permissions.canEditOwnFacilityAssignment ? '✅' : '❌',
      })),
    )

    // Expected vs Actual
    console.log('\n✅ Expected Results:')
    console.table([
      { Role: 'kullanici', 'Nav Items': 1, 'Delete Users': '❌', 'Reset System': '❌' },
      { Role: 'superadmin', 'Nav Items': 4, 'Delete Users': '❌', 'Reset System': '❌' },
      { Role: 'kurucu', 'Nav Items': 8, 'Delete Users': '✅', 'Reset System': '✅' },
    ])

    // Validation
    const validation = {
      kullanici: results[0].navItemCount === 1,
      superadmin: results[1].navItemCount === 4 && !results[1].permissions.canDeleteUsers,
      kurucu: results[2].navItemCount === 8 && results[2].permissions.canResetSystem,
    }

    console.log('\n🎯 Validation Results:')
    Object.entries(validation).forEach(([role, passed]) => {
      console.log(`${role}: ${passed ? '✅ PASS' : '❌ FAIL'}`)
    })

    const allPassed = Object.values(validation).every((v) => v)
    console.log(
      `\n🏆 Overall Test Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`,
    )

    return results
  }

  // Firestore rules test simülasyonu
  testFirestoreRulesSimulation() {
    console.log('🔥 Firestore Rules Simulation Test')

    const testCases = [
      {
        role: 'kullanici',
        collection: 'facilities',
        operation: 'read',
        facilityId: 'tesis1',
        expected: true,
      },
      {
        role: 'kullanici',
        collection: 'facilities',
        operation: 'write',
        facilityId: 'tesis1',
        expected: false,
      },
      {
        role: 'superadmin',
        collection: 'teams',
        operation: 'create',
        facilityId: 'tesis1',
        expected: true,
      },
      {
        role: 'superadmin',
        collection: 'teams',
        operation: 'delete',
        facilityId: 'tesis1',
        expected: false,
      },
      {
        role: 'superadmin',
        collection: 'users',
        operation: 'update_own_facilities',
        expected: false,
      },
      { role: 'kurucu', collection: 'systemSettings', operation: 'write', expected: true },
      { role: 'kullanici', collection: 'systemSettings', operation: 'write', expected: false },
    ]

    console.table(
      testCases.map((test) => ({
        Role: test.role,
        Collection: test.collection,
        Operation: test.operation,
        Expected: test.expected ? '✅ Allow' : '❌ Deny',
        Result: this.simulateFirestoreRule(test) ? '✅ Allow' : '❌ Deny',
        Status: this.simulateFirestoreRule(test) === test.expected ? '✅ PASS' : '❌ FAIL',
      })),
    )
  }

  // Firestore rule simülasyonu
  simulateFirestoreRule(test) {
    const { role, collection, operation, facilityId } = test

    const isFounder = role === 'kurucu'
    const isSuperAdmin = role === 'superadmin'
    const hasAssignedFacility = facilityId === 'tesis1' // Mock assigned facility

    switch (collection) {
      case 'facilities':
        if (operation === 'read') return isFounder || hasAssignedFacility
        if (operation === 'write') return isFounder
        break

      case 'teams':
        if (operation === 'read') return isFounder || hasAssignedFacility
        if (operation === 'create') return isFounder || isSuperAdmin
        if (operation === 'delete') return isFounder
        break

      case 'users':
        if (operation === 'update_own_facilities') return isFounder
        break

      case 'systemSettings':
        if (operation === 'read') return true // All can read
        if (operation === 'write') return isFounder
        break
    }

    return false
  }

  // Quick test method
  quickTest() {
    console.clear()
    console.log('⚡ Quick Permission Test')
    console.log('======================')

    return this.testAllRoles()
  }
}

// Global test instance
const permissionTester = new PermissionTester()

// Console'da kullanım için global metodlar
window.testPermissions = {
  quick: () => permissionTester.quickTest(),
  full: () => permissionTester.testAllRoles(),
  firestore: () => permissionTester.testFirestoreRulesSimulation(),
  role: (role) => permissionTester.checkPermissions(role),
  help: () => {
    console.log(`
🧪 Permission Test Commands:

testPermissions.quick()     - Hızlı test (tüm roller)
testPermissions.full()      - Detaylı test
testPermissions.firestore() - Firestore rules simülasyonu
testPermissions.role('kurucu') - Specific role test
testPermissions.help()      - Bu yardım mesajı

Roller: 'kullanici', 'superadmin', 'kurucu'
    `)
  },
}

console.log('🎮 Permission Tester Loaded! Type: testPermissions.help()')

export default permissionTester
