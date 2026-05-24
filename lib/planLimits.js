export const PLAN_LIMITS = {
  free: {
    maxAccounts: 1,
    maxOperations: 40,
    canViewReportes: false,
    canViewCalendario: false,
    canViewSetupAnalysis: false,
    canViewAllStats: true,
  },
  pro: {
    maxAccounts: Infinity,
    maxOperations: Infinity,
    canViewReportes: true,
    canViewCalendario: true,
    canViewSetupAnalysis: true,
    canViewAllStats: true,
  },
  business: {
    maxAccounts: Infinity,
    maxOperations: Infinity,
    canViewReportes: true,
    canViewCalendario: true,
    canViewSetupAnalysis: true,
    canViewAllStats: true,
  },
  admin: {
    maxAccounts: Infinity,
    maxOperations: Infinity,
    canViewReportes: true,
    canViewCalendario: true,
    canViewSetupAnalysis: true,
    canViewAllStats: true,
  }
}
