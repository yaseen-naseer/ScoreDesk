/**
 * Versioning Management Page
 * Comprehensive interface for managing data versioning
 */

'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  History, 
  BarChart3, 
  Settings, 
  Clock,
  Database,
  Activity,
  GitBranch,
  Users
} from 'lucide-react'
import { VersionHistoryPanel } from '@/components/ui/version-history-panel'
import { VersionAnalyticsDashboard } from '@/components/ui/version-analytics-dashboard'
import { VersionTimeline } from '@/components/ui/version-timeline'
import { useVersioningStats, useVersioningOptions } from '@/hooks/use-data-versioning'

export default function VersioningPage() {
  const [selectedEntity, setSelectedEntity] = useState<{
    entityId: string
    entityType: string
  } | null>(null)

  const { stats, loading: statsLoading } = useVersioningStats()
  const { options, updateOptions } = useVersioningOptions()

  const handleEntitySelect = (entityId: string, entityType: string) => {
    setSelectedEntity({ entityId, entityType })
  }

  const handleVersionRestore = async (version: any) => {
    console.log('Restoring version:', version)
    // Implement restore logic
  }

  if (statsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Activity className="h-8 w-8 animate-spin mr-3" />
          <span>Loading versioning data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Data Versioning</h1>
        <p className="text-gray-600">
          Manage and track data changes with comprehensive version control
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Versions</p>
                <p className="text-2xl font-bold">{stats.totalVersions.toLocaleString()}</p>
              </div>
              <Database className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Entities</p>
                <p className="text-2xl font-bold">{stats.totalEntities.toLocaleString()}</p>
              </div>
              <GitBranch className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Versions/Entity</p>
                <p className="text-2xl font-bold">{stats.averageVersionsPerEntity.toFixed(1)}</p>
              </div>
              <Activity className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Storage Used</p>
                <p className="text-2xl font-bold">
                  {stats.storageSize > 1024 * 1024 
                    ? `${(stats.storageSize / (1024 * 1024)).toFixed(1)} MB`
                    : `${(stats.storageSize / 1024).toFixed(1)} KB`
                  }
                </p>
              </div>
              <Database className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Entity Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Select Entity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 mb-4">
                    Choose an entity to view its version history
                  </div>
                  
                  {/* Sample entities - in real app, these would come from your data */}
                  <div className="space-y-2">
                    {[
                      { id: 'match-1', type: 'matches', name: 'Match #1' },
                      { id: 'player-1', type: 'players', name: 'John Doe' },
                      { id: 'team-1', type: 'teams', name: 'Team Alpha' },
                      { id: 'tournament-1', type: 'tournaments', name: 'Spring Championship' }
                    ].map((entity) => (
                      <div
                        key={`${entity.type}-${entity.id}`}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 ${
                          selectedEntity?.entityId === entity.id && selectedEntity?.entityType === entity.type
                            ? 'ring-2 ring-blue-500 bg-blue-50'
                            : 'bg-white'
                        }`}
                        onClick={() => handleEntitySelect(entity.id, entity.type)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{entity.name}</div>
                            <div className="text-sm text-gray-500">{entity.type}</div>
                          </div>
                          <Badge variant="outline">{entity.id}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Version History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Version History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedEntity ? (
                  <VersionHistoryPanel
                    entityId={selectedEntity.entityId}
                    entityType={selectedEntity.entityType}
                    onVersionRestore={handleVersionRestore}
                    compact
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select an entity to view its version history</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          {selectedEntity ? (
            <VersionTimeline
              entityId={selectedEntity.entityId}
              entityType={selectedEntity.entityType}
              onVersionRestore={handleVersionRestore}
              includeSnapshots={true}
              limit={100}
            />
          ) : (
            <Card>
              <CardContent className="p-8">
                <div className="text-center text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select an entity to view its timeline</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <VersionAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Versioning Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Max Versions Per Entity
                    </label>
                    <input
                      type="number"
                      value={options.maxVersionsPerEntity}
                      onChange={(e) => updateOptions({ maxVersionsPerEntity: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="1000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Version Retention Days
                    </label>
                    <input
                      type="number"
                      value={options.versionRetentionDays}
                      onChange={(e) => updateOptions({ versionRetentionDays: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="365"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="autoVersioning"
                      checked={options.enableAutoVersioning}
                      onChange={(e) => updateOptions({ enableAutoVersioning: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="autoVersioning" className="text-sm font-medium">
                      Enable Auto Versioning
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="checksumValidation"
                      checked={options.enableChecksumValidation}
                      onChange={(e) => updateOptions({ enableChecksumValidation: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="checksumValidation" className="text-sm font-medium">
                      Enable Checksum Validation
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="metadataTracking"
                      checked={options.enableMetadataTracking}
                      onChange={(e) => updateOptions({ enableMetadataTracking: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="metadataTracking" className="text-sm font-medium">
                      Enable Metadata Tracking
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="changeTracking"
                      checked={options.enableChangeTracking}
                      onChange={(e) => updateOptions({ enableChangeTracking: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="changeTracking" className="text-sm font-medium">
                      Enable Change Tracking
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button variant="outline">
                    Reset to Defaults
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
