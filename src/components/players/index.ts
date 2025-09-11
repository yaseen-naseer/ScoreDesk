/**
 * Players Components Index
 * Exports all player-related components
 */

export { PlayerStatistics } from './player-statistics'

export default {
  PlayerStatistics: () => import('./player-statistics'),
}
