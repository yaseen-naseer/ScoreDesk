/**
 * Data Versioning Service
 * Provides comprehensive version control for data changes with history tracking and rollback capabilities
 */

export interface DataVersion {
  id: string
  entityId: string
  entityType: string
  version: number
  data: any
  previousVersion?: string
  timestamp: Date
  userId?: string
  organizationId?: string
  changeType: 'create' | 'update' | 'delete' | 'restore'
  changeDescription?: string
  metadata?: {
    source: 'local' | 'remote' | 'sync' | 'manual'
    syncId?: string
    conflictId?: string
    parentVersion?: string
    tags?: string[]
    checksum?: string
    size?: number
  }
}

export interface VersionHistory {
  entityId: string
  entityType: string
  versions: DataVersion[]
  currentVersion: string
  totalVersions: number
  createdAt: Date
  lastModified: Date
}

export interface VersionDiff {
  versionId: string
  previousVersionId?: string
  changes: {
    field: string
    oldValue: any
    newValue: any
    changeType: 'added' | 'modified' | 'removed'
  }[]
  summary: {
    addedFields: number
    modifiedFields: number
    removedFields: number
    totalChanges: number
  }
}

export interface VersioningOptions {
  maxVersionsPerEntity: number
  enableAutoVersioning: boolean
  enableChecksumValidation: boolean
  enableCompression: boolean
  versionRetentionDays: number
  enableMetadataTracking: boolean
  enableChangeTracking: boolean
}

export interface VersionQuery {
  entityId?: string
  entityType?: string
  userId?: string
  organizationId?: string
  changeType?: DataVersion['changeType']
  startDate?: Date
  endDate?: Date
  tags?: string[]
  limit?: number
  offset?: number
}

export type VersionEventCallback = (event: {
  type: 'version_created' | 'version_restored' | 'version_deleted' | 'history_cleared'
  version?: DataVersion
  history?: VersionHistory
  diff?: VersionDiff
}) => void

export class DataVersioningService {
  private versions: Map<string, DataVersion> = new Map()
  private histories: Map<string, VersionHistory> = new Map()
  private eventCallbacks: Set<VersionEventCallback> = new Set()
  private options: VersioningOptions = {
    maxVersionsPerEntity: 50,
    enableAutoVersioning: true,
    enableChecksumValidation: true,
    enableCompression: false,
    versionRetentionDays: 30,
    enableMetadataTracking: true,
    enableChangeTracking: true
  }

  constructor(options?: Partial<VersioningOptions>) {
    if (options) {
      this.options = { ...this.options, ...options }
    }
  }

  /**
   * Create a new version of data
   */
  async createVersion(
    entityId: string,
    entityType: string,
    data: any,
    changeType: DataVersion['changeType'],
    options?: {
      userId?: string
      organizationId?: string
      changeDescription?: string
      metadata?: DataVersion['metadata']
      previousVersion?: string
    }
  ): Promise<DataVersion> {
    const historyKey = `${entityType}:${entityId}`
    const history = this.histories.get(historyKey)
    
    // Calculate next version number
    const nextVersion = history ? history.versions.length + 1 : 1
    
    // Get previous version for diff calculation
    const previousVersion = options?.previousVersion || history?.currentVersion
    
    // Create new version
    const version: DataVersion = {
      id: this.generateVersionId(),
      entityId,
      entityType,
      version: nextVersion,
      data: this.prepareDataForStorage(data),
      previousVersion,
      timestamp: new Date(),
      userId: options?.userId,
      organizationId: options?.organizationId,
      changeType,
      changeDescription: options?.changeDescription,
      metadata: {
        source: 'local',
        checksum: this.options.enableChecksumValidation ? this.calculateChecksum(data) : undefined,
        size: JSON.stringify(data).length,
        tags: options?.metadata?.tags || [],
        ...options?.metadata
      }
    }

    // Store version
    this.versions.set(version.id, version)

    // Update or create history
    if (history) {
      history.versions.push(version)
      history.currentVersion = version.id
      history.totalVersions = history.versions.length
      history.lastModified = version.timestamp
    } else {
      const newHistory: VersionHistory = {
        entityId,
        entityType,
        versions: [version],
        currentVersion: version.id,
        totalVersions: 1,
        createdAt: version.timestamp,
        lastModified: version.timestamp
      }
      this.histories.set(historyKey, newHistory)
    }

    // Cleanup old versions if needed
    await this.cleanupOldVersions(historyKey)

    // Calculate diff if change tracking is enabled
    let diff: VersionDiff | undefined
    if (this.options.enableChangeTracking && previousVersion) {
      diff = await this.calculateDiff(version.id, previousVersion)
    }

    // Notify event callbacks
    this.notifyEvent({
      type: 'version_created',
      version,
      diff
    })

    return version
  }

  /**
   * Get version by ID
   */
  getVersion(versionId: string): DataVersion | undefined {
    return this.versions.get(versionId)
  }

  /**
   * Get current version of entity
   */
  getCurrentVersion(entityId: string, entityType: string): DataVersion | undefined {
    const historyKey = `${entityType}:${entityId}`
    const history = this.histories.get(historyKey)
    
    if (!history || !history.currentVersion) return undefined
    
    return this.versions.get(history.currentVersion)
  }

  /**
   * Get version history for entity
   */
  getVersionHistory(entityId: string, entityType: string): VersionHistory | undefined {
    const historyKey = `${entityType}:${entityId}`
    return this.histories.get(historyKey)
  }

  /**
   * Get all versions matching query
   */
  queryVersions(query: VersionQuery): DataVersion[] {
    let results = Array.from(this.versions.values())

    // Apply filters
    if (query.entityId) {
      results = results.filter(v => v.entityId === query.entityId)
    }
    
    if (query.entityType) {
      results = results.filter(v => v.entityType === query.entityType)
    }
    
    if (query.userId) {
      results = results.filter(v => v.userId === query.userId)
    }
    
    if (query.organizationId) {
      results = results.filter(v => v.organizationId === query.organizationId)
    }
    
    if (query.changeType) {
      results = results.filter(v => v.changeType === query.changeType)
    }
    
    if (query.startDate) {
      results = results.filter(v => v.timestamp >= query.startDate!)
    }
    
    if (query.endDate) {
      results = results.filter(v => v.timestamp <= query.endDate!)
    }
    
    if (query.tags && query.tags.length > 0) {
      results = results.filter(v => 
        v.metadata?.tags?.some(tag => query.tags!.includes(tag))
      )
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    // Apply pagination
    if (query.offset) {
      results = results.slice(query.offset)
    }
    
    if (query.limit) {
      results = results.slice(0, query.limit)
    }

    return results
  }

  /**
   * Restore data to a specific version
   */
  async restoreToVersion(
    versionId: string,
    options?: {
      userId?: string
      organizationId?: string
      changeDescription?: string
    }
  ): Promise<DataVersion> {
    const version = this.versions.get(versionId)
    if (!version) {
      throw new Error(`Version not found: ${versionId}`)
    }

    // Create new version with restored data
    const restoredVersion = await this.createVersion(
      version.entityId,
      version.entityType,
      version.data,
      'restore',
      {
        userId: options?.userId,
        organizationId: options?.organizationId,
        changeDescription: options?.changeDescription || `Restored to version ${version.version}`,
        metadata: {
          source: 'manual',
          parentVersion: versionId,
          tags: ['restore']
        }
      }
    )

    // Notify event callbacks
    this.notifyEvent({
      type: 'version_restored',
      version: restoredVersion
    })

    return restoredVersion
  }

  /**
   * Calculate diff between two versions
   */
  async calculateDiff(versionId: string, previousVersionId: string): Promise<VersionDiff> {
    const version = this.versions.get(versionId)
    const previousVersion = this.versions.get(previousVersionId)

    if (!version || !previousVersion) {
      throw new Error('One or both versions not found')
    }

    const changes = this.calculateFieldChanges(previousVersion.data, version.data)
    
    const summary = {
      addedFields: changes.filter(c => c.changeType === 'added').length,
      modifiedFields: changes.filter(c => c.changeType === 'modified').length,
      removedFields: changes.filter(c => c.changeType === 'removed').length,
      totalChanges: changes.length
    }

    return {
      versionId,
      previousVersionId,
      changes,
      summary
    }
  }

  /**
   * Calculate field-level changes between two data objects
   */
  private calculateFieldChanges(oldData: any, newData: any): VersionDiff['changes'] {
    const changes: VersionDiff['changes'] = []
    const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})])

    for (const key of allKeys) {
      const oldValue = oldData?.[key]
      const newValue = newData?.[key]

      if (oldValue === undefined && newValue !== undefined) {
        changes.push({
          field: key,
          oldValue: undefined,
          newValue,
          changeType: 'added'
        })
      } else if (oldValue !== undefined && newValue === undefined) {
        changes.push({
          field: key,
          oldValue,
          newValue: undefined,
          changeType: 'removed'
        })
      } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field: key,
          oldValue,
          newValue,
          changeType: 'modified'
        })
      }
    }

    return changes
  }

  /**
   * Delete version
   */
  async deleteVersion(versionId: string): Promise<void> {
    const version = this.versions.get(versionId)
    if (!version) {
      throw new Error(`Version not found: ${versionId}`)
    }

    const historyKey = `${version.entityType}:${version.entityId}`
    const history = this.histories.get(historyKey)

    if (history) {
      // Remove version from history
      history.versions = history.versions.filter(v => v.id !== versionId)
      history.totalVersions = history.versions.length

      // Update current version if needed
      if (history.currentVersion === versionId) {
        history.currentVersion = history.versions.length > 0 
          ? history.versions[history.versions.length - 1].id 
          : ''
      }

      // Update last modified
      if (history.versions.length > 0) {
        history.lastModified = history.versions[history.versions.length - 1].timestamp
      }
    }

    // Remove version
    this.versions.delete(versionId)

    // Notify event callbacks
    this.notifyEvent({
      type: 'version_deleted',
      version
    })
  }

  /**
   * Clear version history for entity
   */
  async clearVersionHistory(entityId: string, entityType: string): Promise<void> {
    const historyKey = `${entityType}:${entityId}`
    const history = this.histories.get(historyKey)

    if (history) {
      // Delete all versions
      for (const version of history.versions) {
        this.versions.delete(version.id)
      }

      // Remove history
      this.histories.delete(historyKey)

      // Notify event callbacks
      this.notifyEvent({
        type: 'history_cleared',
        history
      })
    }
  }

  /**
   * Cleanup old versions based on retention policy
   */
  private async cleanupOldVersions(historyKey: string): Promise<void> {
    const history = this.histories.get(historyKey)
    if (!history) return

    // Check if we exceed max versions
    if (history.versions.length > this.options.maxVersionsPerEntity) {
      const versionsToDelete = history.versions
        .slice(0, history.versions.length - this.options.maxVersionsPerEntity)

      for (const version of versionsToDelete) {
        this.versions.delete(version.id)
      }

      history.versions = history.versions.slice(-this.options.maxVersionsPerEntity)
      history.totalVersions = history.versions.length
    }

    // Check retention days
    const cutoffDate = new Date(Date.now() - (this.options.versionRetentionDays * 24 * 60 * 60 * 1000))
    const versionsToDelete = history.versions.filter(v => v.timestamp < cutoffDate)

    for (const version of versionsToDelete) {
      this.versions.delete(version.id)
    }

    if (versionsToDelete.length > 0) {
      history.versions = history.versions.filter(v => v.timestamp >= cutoffDate)
      history.totalVersions = history.versions.length
    }
  }

  /**
   * Prepare data for storage (compression, validation, etc.)
   */
  private prepareDataForStorage(data: any): any {
    if (this.options.enableCompression) {
      // Implement compression logic here
      return data
    }
    return data
  }

  /**
   * Calculate checksum for data validation
   */
  private calculateChecksum(data: any): string {
    const str = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  /**
   * Generate unique version ID
   */
  private generateVersionId(): string {
    return `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get versioning statistics
   */
  getVersioningStats(): {
    totalVersions: number
    totalEntities: number
    totalHistories: number
    averageVersionsPerEntity: number
    storageSize: number
    oldestVersion?: Date
    newestVersion?: Date
  } {
    const versions = Array.from(this.versions.values())
    const histories = Array.from(this.histories.values())

    const stats = {
      totalVersions: versions.length,
      totalEntities: histories.length,
      totalHistories: histories.length,
      averageVersionsPerEntity: 0,
      storageSize: 0,
      oldestVersion: undefined as Date | undefined,
      newestVersion: undefined as Date | undefined
    }

    if (versions.length > 0) {
      stats.averageVersionsPerEntity = versions.length / histories.length
      stats.storageSize = versions.reduce((sum, v) => sum + (v.metadata?.size || 0), 0)
      
      const timestamps = versions.map(v => v.timestamp)
      stats.oldestVersion = new Date(Math.min(...timestamps.map(t => t.getTime())))
      stats.newestVersion = new Date(Math.max(...timestamps.map(t => t.getTime())))
    }

    return stats
  }

  /**
   * Update versioning options
   */
  updateOptions(options: Partial<VersioningOptions>): void {
    this.options = { ...this.options, ...options }
  }

  /**
   * Subscribe to version events
   */
  onEvent(callback: VersionEventCallback): () => void {
    this.eventCallbacks.add(callback)
    return () => this.eventCallbacks.delete(callback)
  }

  /**
   * Notify event callbacks
   */
  private notifyEvent(event: Parameters<VersionEventCallback>[0]): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        console.error('Error in version event callback:', error)
      }
    })
  }

  /**
   * Export version data
   */
  exportVersions(query?: VersionQuery): {
    versions: DataVersion[]
    histories: VersionHistory[]
    metadata: {
      exportedAt: Date
      totalVersions: number
      totalHistories: number
    }
  } {
    const versions = query ? this.queryVersions(query) : Array.from(this.versions.values())
    const histories = Array.from(this.histories.values())

    return {
      versions,
      histories,
      metadata: {
        exportedAt: new Date(),
        totalVersions: versions.length,
        totalHistories: histories.length
      }
    }
  }

  /**
   * Import version data
   */
  async importVersions(data: {
    versions: DataVersion[]
    histories: VersionHistory[]
  }): Promise<void> {
    // Import versions
    for (const version of data.versions) {
      this.versions.set(version.id, version)
    }

    // Import histories
    for (const history of data.histories) {
      const historyKey = `${history.entityType}:${history.entityId}`
      this.histories.set(historyKey, history)
    }
  }
}

// Export singleton instance
export const dataVersioningService = new DataVersioningService()
