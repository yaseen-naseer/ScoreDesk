/**
 * Version History Manager
 * Integrates data versioning with existing systems and provides automated versioning
 */

import { dataVersioningService, DataVersion, VersionHistory, VersionDiff } from './data-versioning-service'
import { IndexedDBManager } from '@/lib/storage/indexeddb-manager'

export interface AutoVersioningConfig {
  enabled: boolean
  entityTypes: string[]
  changeThreshold: number // Minimum changes required to create version
  timeThreshold: number // Minimum time between versions (ms)
  excludedFields: string[] // Fields to exclude from versioning
  includedFields?: string[] // Specific fields to include (if provided, only these are versioned)
}

export interface VersionSnapshot {
  entityId: string
  entityType: string
  data: any
  timestamp: Date
  userId?: string
  organizationId?: string
}

export interface VersioningMetadata {
  source: 'manual' | 'auto' | 'sync' | 'backup'
  trigger: string
  batchId?: string
  operationId?: string
  tags?: string[]
}

export class VersionHistoryManager {
  private indexedDB: IndexedDBManager
  private autoVersioningConfig: AutoVersioningConfig = {
    enabled: true,
    entityTypes: ['matches', 'players', 'teams', 'tournaments', 'venues'],
    changeThreshold: 1,
    timeThreshold: 5000, // 5 seconds
    excludedFields: ['updated_at', 'last_sync', 'sync_status']
  }
  private pendingSnapshots: Map<string, VersionSnapshot> = new Map()
  private lastVersionTimes: Map<string, Date> = new Map()

  constructor() {
    this.indexedDB = new IndexedDBManager({
      name: 'ScoreDeskVersioning',
      version: 1,
      stores: [
        {
          name: 'versionSnapshots',
          keyPath: 'id',
          indexes: [
            { name: 'entityId', keyPath: 'entityId' },
            { name: 'entityType', keyPath: 'entityType' },
            { name: 'timestamp', keyPath: 'timestamp' }
          ]
        }
      ]
    })
  }

  /**
   * Initialize version history manager
   */
  async initialize(): Promise<void> {
    await this.indexedDB.open()
  }

  /**
   * Create version with automatic detection
   */
  async createVersion(
    entityId: string,
    entityType: string,
    newData: any,
    metadata?: VersioningMetadata
  ): Promise<DataVersion | null> {
    // Check if auto-versioning is enabled for this entity type
    if (!this.autoVersioningConfig.enabled || 
        !this.autoVersioningConfig.entityTypes.includes(entityType)) {
      return null
    }

    // Get current version for comparison
    const currentVersion = dataVersioningService.getCurrentVersion(entityId, entityType)
    
    // Check time threshold
    const lastVersionKey = `${entityType}:${entityId}`
    const lastVersionTime = this.lastVersionTimes.get(lastVersionKey)
    const now = new Date()
    
    if (lastVersionTime && 
        (now.getTime() - lastVersionTime.getTime()) < this.autoVersioningConfig.timeThreshold) {
      // Store as pending snapshot for later processing
      this.pendingSnapshots.set(lastVersionKey, {
        entityId,
        entityType,
        data: newData,
        timestamp: now,
        userId: metadata?.source === 'manual' ? 'current-user' : undefined,
        organizationId: 'current-org'
      })
      return null
    }

    // Calculate changes if previous version exists
    let shouldCreateVersion = true
    if (currentVersion) {
      const changes = this.calculateSignificantChanges(
        currentVersion.data,
        newData,
        entityType
      )
      
      if (changes.length < this.autoVersioningConfig.changeThreshold) {
        shouldCreateVersion = false
      }
    }

    if (!shouldCreateVersion) {
      return null
    }

    // Create version
    const version = await dataVersioningService.createVersion(
      entityId,
      entityType,
      newData,
      currentVersion ? 'update' : 'create',
      {
        userId: metadata?.source === 'manual' ? 'current-user' : undefined,
        organizationId: 'current-org',
        changeDescription: this.generateChangeDescription(currentVersion, newData, entityType),
        metadata: {
          source: metadata?.source === 'manual' ? 'local' : 'auto',
          tags: metadata?.tags || [],
          ...metadata
        },
        previousVersion: currentVersion?.id
      }
    )

    // Update last version time
    this.lastVersionTimes.set(lastVersionKey, now)

    // Store snapshot in IndexedDB
    await this.storeSnapshot(version)

    return version
  }

  /**
   * Batch create versions for multiple entities
   */
  async batchCreateVersions(
    entities: Array<{
      entityId: string
      entityType: string
      data: any
      metadata?: VersioningMetadata
    }>,
    batchMetadata?: {
      batchId: string
      operationId: string
      description: string
    }
  ): Promise<DataVersion[]> {
    const versions: DataVersion[] = []

    for (const entity of entities) {
      try {
        const version = await this.createVersion(
          entity.entityId,
          entity.entityType,
          entity.data,
          {
            ...entity.metadata,
            batchId: batchMetadata?.batchId,
            operationId: batchMetadata?.operationId,
            source: 'sync'
          }
        )

        if (version) {
          versions.push(version)
        }
      } catch (error) {
        console.error(`Failed to create version for ${entity.entityType}:${entity.entityId}`, error)
      }
    }

    return versions
  }

  /**
   * Process pending snapshots
   */
  async processPendingSnapshots(): Promise<DataVersion[]> {
    const versions: DataVersion[] = []
    const now = new Date()

    for (const [key, snapshot] of this.pendingSnapshots) {
      const lastVersionTime = this.lastVersionTimes.get(key)
      
      // Check if enough time has passed
      if (lastVersionTime && 
          (now.getTime() - lastVersionTime.getTime()) >= this.autoVersioningConfig.timeThreshold) {
        
        const version = await this.createVersion(
          snapshot.entityId,
          snapshot.entityType,
          snapshot.data,
          {
            source: 'auto',
            trigger: 'pending_snapshot',
            tags: ['batched']
          }
        )

        if (version) {
          versions.push(version)
          this.pendingSnapshots.delete(key)
        }
      }
    }

    return versions
  }

  /**
   * Restore entity to specific version
   */
  async restoreToVersion(
    versionId: string,
    options?: {
      userId?: string
      organizationId?: string
      changeDescription?: string
    }
  ): Promise<DataVersion> {
    const restoredVersion = await dataVersioningService.restoreToVersion(versionId, options)
    
    // Store snapshot of restored version
    await this.storeSnapshot(restoredVersion)

    return restoredVersion
  }

  /**
   * Get version timeline for entity
   */
  async getVersionTimeline(
    entityId: string,
    entityType: string,
    options?: {
      includeSnapshots?: boolean
      limit?: number
      startDate?: Date
      endDate?: Date
    }
  ): Promise<{
    versions: DataVersion[]
    snapshots: VersionSnapshot[]
    timeline: Array<{
      type: 'version' | 'snapshot'
      data: DataVersion | VersionSnapshot
      timestamp: Date
    }>
  }> {
    // Get versions from versioning service
    const history = dataVersioningService.getVersionHistory(entityId, entityType)
    const versions = history?.versions || []

    // Get snapshots from IndexedDB
    const snapshots = options?.includeSnapshots 
      ? await this.getSnapshots(entityId, entityType, options) 
      : []

    // Create timeline
    const timeline: Array<{
      type: 'version' | 'snapshot'
      data: DataVersion | VersionSnapshot
      timestamp: Date
    }> = []

    // Add versions to timeline
    versions.forEach(version => {
      timeline.push({
        type: 'version',
        data: version,
        timestamp: version.timestamp
      })
    })

    // Add snapshots to timeline
    snapshots.forEach(snapshot => {
      timeline.push({
        type: 'snapshot',
        data: snapshot,
        timestamp: snapshot.timestamp
      })
    })

    // Sort by timestamp
    timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    // Apply date filters
    let filteredTimeline = timeline
    if (options?.startDate) {
      filteredTimeline = filteredTimeline.filter(item => item.timestamp >= options.startDate!)
    }
    if (options?.endDate) {
      filteredTimeline = filteredTimeline.filter(item => item.timestamp <= options.endDate!)
    }

    // Apply limit
    if (options?.limit) {
      filteredTimeline = filteredTimeline.slice(0, options.limit)
    }

    return {
      versions,
      snapshots,
      timeline: filteredTimeline
    }
  }

  /**
   * Compare versions and get detailed diff
   */
  async compareVersions(
    versionId1: string,
    versionId2: string
  ): Promise<{
    version1: DataVersion
    version2: DataVersion
    diff: VersionDiff
    summary: {
      totalChanges: number
      addedFields: number
      modifiedFields: number
      removedFields: number
      significantChanges: string[]
    }
  }> {
    const version1 = dataVersioningService.getVersion(versionId1)
    const version2 = dataVersioningService.getVersion(versionId2)

    if (!version1 || !version2) {
      throw new Error('One or both versions not found')
    }

    const diff = await dataVersioningService.calculateDiff(versionId1, versionId2)
    
    // Identify significant changes
    const significantChanges = this.identifySignificantChanges(diff, version1.entityType)

    return {
      version1,
      version2,
      diff,
      summary: {
        totalChanges: diff.summary.totalChanges,
        addedFields: diff.summary.addedFields,
        modifiedFields: diff.summary.modifiedFields,
        removedFields: diff.summary.removedFields,
        significantChanges
      }
    }
  }

  /**
   * Get versioning analytics
   */
  async getVersioningAnalytics(options?: {
    entityType?: string
    startDate?: Date
    endDate?: Date
    userId?: string
  }): Promise<{
    totalVersions: number
    versionsByEntityType: Record<string, number>
    versionsByUser: Record<string, number>
    versionsByDay: Record<string, number>
    averageVersionsPerEntity: number
    mostActiveEntities: Array<{
      entityId: string
      entityType: string
      versionCount: number
    }>
    changePatterns: {
      mostChangedFields: Array<{
        field: string
        entityType: string
        changeCount: number
      }>
    }
  }> {
    const query = {
      entityType: options?.entityType,
      startDate: options?.startDate,
      endDate: options?.endDate,
      userId: options?.userId
    }

    const versions = dataVersioningService.queryVersions(query)
    const histories = Array.from(
      new Set(versions.map(v => `${v.entityType}:${v.entityId}`))
    )

    // Analytics calculations
    const versionsByEntityType: Record<string, number> = {}
    const versionsByUser: Record<string, number> = {}
    const versionsByDay: Record<string, number> = {}
    const entityVersionCounts: Record<string, number> = {}
    const fieldChangeCounts: Record<string, Record<string, number>> = {}

    versions.forEach(version => {
      // By entity type
      versionsByEntityType[version.entityType] = (versionsByEntityType[version.entityType] || 0) + 1

      // By user
      if (version.userId) {
        versionsByUser[version.userId] = (versionsByUser[version.userId] || 0) + 1
      }

      // By day
      const day = version.timestamp.toISOString().split('T')[0]
      versionsByDay[day] = (versionsByDay[day] || 0) + 1

      // Entity version counts
      const entityKey = `${version.entityType}:${version.entityId}`
      entityVersionCounts[entityKey] = (entityVersionCounts[entityKey] || 0) + 1

      // Field change counts (would need diff calculation for accuracy)
      if (!fieldChangeCounts[version.entityType]) {
        fieldChangeCounts[version.entityType] = {}
      }
    })

    // Most active entities
    const mostActiveEntities = Object.entries(entityVersionCounts)
      .map(([entityKey, count]) => {
        const [entityType, entityId] = entityKey.split(':')
        return { entityId, entityType, versionCount: count }
      })
      .sort((a, b) => b.versionCount - a.versionCount)
      .slice(0, 10)

    return {
      totalVersions: versions.length,
      versionsByEntityType,
      versionsByUser,
      versionsByDay,
      averageVersionsPerEntity: versions.length / histories.length,
      mostActiveEntities,
      changePatterns: {
        mostChangedFields: [] // Would need more detailed analysis
      }
    }
  }

  /**
   * Update auto-versioning configuration
   */
  updateAutoVersioningConfig(config: Partial<AutoVersioningConfig>): void {
    this.autoVersioningConfig = { ...this.autoVersioningConfig, ...config }
  }

  /**
   * Calculate significant changes between data objects
   */
  private calculateSignificantChanges(
    oldData: any,
    newData: any,
    entityType: string
  ): Array<{ field: string; oldValue: any; newValue: any }> {
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = []
    
    // Get field configuration for entity type
    const excludedFields = this.autoVersioningConfig.excludedFields
    const includedFields = this.autoVersioningConfig.includedFields

    const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})])

    for (const key of allKeys) {
      // Skip excluded fields
      if (excludedFields.includes(key)) continue
      
      // Skip if only specific fields should be included
      if (includedFields && !includedFields.includes(key)) continue

      const oldValue = oldData?.[key]
      const newValue = newData?.[key]

      // Check if values are different
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({ field: key, oldValue, newValue })
      }
    }

    return changes
  }

  /**
   * Generate change description
   */
  private generateChangeDescription(
    currentVersion: DataVersion | undefined,
    newData: any,
    entityType: string
  ): string {
    if (!currentVersion) {
      return `Initial ${entityType} creation`
    }

    const changes = this.calculateSignificantChanges(currentVersion.data, newData, entityType)
    
    if (changes.length === 0) {
      return 'No significant changes detected'
    }

    if (changes.length === 1) {
      return `Updated ${changes[0].field}`
    }

    if (changes.length <= 3) {
      return `Updated ${changes.map(c => c.field).join(', ')}`
    }

    return `Updated ${changes.length} fields`
  }

  /**
   * Identify significant changes from diff
   */
  private identifySignificantChanges(diff: VersionDiff, entityType: string): string[] {
    const significantFields = this.getSignificantFields(entityType)
    
    return diff.changes
      .filter(change => significantFields.includes(change.field))
      .map(change => `${change.field}: ${change.changeType}`)
  }

  /**
   * Get significant fields for entity type
   */
  private getSignificantFields(entityType: string): string[] {
    const significantFieldsMap: Record<string, string[]> = {
      matches: ['score', 'status', 'period', 'time_remaining'],
      players: ['name', 'position', 'team_id', 'status'],
      teams: ['name', 'logo_url', 'organization_id'],
      tournaments: ['name', 'status', 'start_date', 'end_date'],
      venues: ['name', 'address', 'capacity']
    }

    return significantFieldsMap[entityType] || []
  }

  /**
   * Store snapshot in IndexedDB
   */
  private async storeSnapshot(version: DataVersion): Promise<void> {
    try {
      await this.indexedDB.add('versionSnapshots', {
        id: `snapshot_${version.id}`,
        versionId: version.id,
        entityId: version.entityId,
        entityType: version.entityType,
        data: version.data,
        timestamp: version.timestamp,
        userId: version.userId,
        organizationId: version.organizationId
      })
    } catch (error) {
      console.error('Failed to store version snapshot:', error)
    }
  }

  /**
   * Get snapshots from IndexedDB
   */
  private async getSnapshots(
    entityId: string,
    entityType: string,
    options?: {
      limit?: number
      startDate?: Date
      endDate?: Date
    }
  ): Promise<VersionSnapshot[]> {
    try {
      const snapshots = await this.indexedDB.query('versionSnapshots', {
        index: 'entityId',
        value: entityId
      })

      return snapshots
        .filter((snapshot: any) => snapshot.entityType === entityType)
        .filter((snapshot: any) => {
          if (options?.startDate && snapshot.timestamp < options.startDate) return false
          if (options?.endDate && snapshot.timestamp > options.endDate) return false
          return true
        })
        .slice(0, options?.limit || 100)
        .map((snapshot: any) => ({
          entityId: snapshot.entityId,
          entityType: snapshot.entityType,
          data: snapshot.data,
          timestamp: new Date(snapshot.timestamp),
          userId: snapshot.userId,
          organizationId: snapshot.organizationId
        }))
    } catch (error) {
      console.error('Failed to get snapshots:', error)
      return []
    }
  }
}

// Export singleton instance
export const versionHistoryManager = new VersionHistoryManager()
