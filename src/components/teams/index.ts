/**
 * Teams Components Index
 * Exports all team-related components
 */

export { TeamRegistrationForm } from '../forms/team-registration-form'
export { TeamCustomizationForm } from './team-customization-form'
export { TeamList } from './team-list'
export { TeamPerformanceDashboard } from './team-performance-dashboard'

export default {
  TeamRegistrationForm: () => import('../forms/team-registration-form'),
  TeamCustomizationForm: () => import('./team-customization-form'),
  TeamList: () => import('./team-list'),
  TeamStatisticsOverview: () => import('./team-statistics-overview'),
  TeamPerformanceAnalytics: () => import('./team-performance-analytics'),
  RosterManagement: () => import('./roster-management'),
}
