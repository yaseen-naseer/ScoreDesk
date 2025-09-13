'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Users, Settings, Save, X, ArrowUp, ArrowDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { TournamentService, TournamentGroup } from '@/lib/services/tournament-service'
import type { Database } from '@/lib/supabase/types'

type Team = Database['public']['Tables']['teams']['Row']
type TournamentTeam = Database['public']['Tables']['tournament_teams']['Row']

interface TournamentGroupManagerProps {
  tournamentId: string
  tournamentName: string
  tournamentFormat: 'league' | 'knockout' | 'group'
  onGroupsUpdated: () => void
}

interface GroupWithTeams extends TournamentGroup {
  teams: (TournamentTeam & { team?: Team })[]
}

export function TournamentGroupManager({
  tournamentId,
  tournamentName,
  tournamentFormat,
  onGroupsUpdated
}: TournamentGroupManagerProps) {
  const { toast } = useToast()
  const tournamentService = new TournamentService()
  
  const [groups, setGroups] = useState<GroupWithTeams[]>([])
  const [availableTeams, setAvailableTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupAdvanceTeams, setNewGroupAdvanceTeams] = useState(2)

  useEffect(() => {
    loadGroups()
    loadAvailableTeams()
  }, [tournamentId])

  const loadGroups = async () => {
    try {
      setLoading(true)
      const tournament = await tournamentService.getTournamentWithDetails(tournamentId)
      
      if (tournament?.groups) {
        const groupsWithTeams = await Promise.all(
          tournament.groups.map(async (group) => {
            const groupTeams = tournament.teams?.filter(tt => tt.group_name === group.name) || []
            return {
              ...group,
              teams: groupTeams
            }
          })
        )
        setGroups(groupsWithTeams)
      }
    } catch (error) {
      console.error('Error loading groups:', error)
      toast({
        title: 'Error',
        description: 'Failed to load tournament groups',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableTeams = async () => {
    try {
      // This would typically fetch teams from the organization
      // For now, we'll use a placeholder
      setAvailableTeams([])
    } catch (error) {
      console.error('Error loading available teams:', error)
    }
  }

  const createGroup = async () => {
    if (!newGroupName.trim()) {
      toast({
        title: 'Error',
        description: 'Group name is required',
        variant: 'destructive'
      })
      return
    }

    try {
      await tournamentService.createTournamentGroups(tournamentId, [{
        name: newGroupName.trim(),
        advance_teams: newGroupAdvanceTeams
      }])
      
      toast({
        title: 'Success',
        description: 'Group created successfully'
      })
      
      setNewGroupName('')
      setNewGroupAdvanceTeams(2)
      setIsCreatingGroup(false)
      loadGroups()
      onGroupsUpdated()
    } catch (error) {
      console.error('Error creating group:', error)
      toast({
        title: 'Error',
        description: 'Failed to create group',
        variant: 'destructive'
      })
    }
  }

  const deleteGroup = async (groupId: string) => {
    try {
      // Note: This would need to be implemented in the service
      // For now, we'll show a placeholder
      toast({
        title: 'Info',
        description: 'Group deletion not yet implemented'
      })
    } catch (error) {
      console.error('Error deleting group:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete group',
        variant: 'destructive'
      })
    }
  }

  const assignTeamToGroup = async (teamId: string, groupName: string) => {
    try {
      await tournamentService.registerTeamForTournament(tournamentId, teamId, groupName)
      
      toast({
        title: 'Success',
        description: 'Team assigned to group successfully'
      })
      
      loadGroups()
      onGroupsUpdated()
    } catch (error) {
      console.error('Error assigning team:', error)
      toast({
        title: 'Error',
        description: 'Failed to assign team to group',
        variant: 'destructive'
      })
    }
  }

  const removeTeamFromGroup = async (teamId: string) => {
    try {
      // Note: This would need to be implemented in the service
      toast({
        title: 'Info',
        description: 'Team removal not yet implemented'
      })
    } catch (error) {
      console.error('Error removing team:', error)
      toast({
        title: 'Error',
        description: 'Failed to remove team from group',
        variant: 'destructive'
      })
    }
  }

  const reorderGroups = async (fromIndex: number, toIndex: number) => {
    try {
      // Note: This would need to be implemented in the service
      toast({
        title: 'Info',
        description: 'Group reordering not yet implemented'
      })
    } catch (error) {
      console.error('Error reordering groups:', error)
      toast({
        title: 'Error',
        description: 'Failed to reorder groups',
        variant: 'destructive'
      })
    }
  }

  if (tournamentFormat !== 'group') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Group Management</CardTitle>
          <CardDescription>
            Group management is only available for group-stage tournaments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Not Available</h3>
            <p className="text-muted-foreground">
              This tournament uses a {tournamentFormat} format, which doesn't require group management.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Group Management</CardTitle>
          <CardDescription>Loading groups...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Group Management</CardTitle>
            <CardDescription>
              Manage tournament groups and team assignments for {tournamentName}
            </CardDescription>
          </div>
          <Dialog open={isCreatingGroup} onOpenChange={setIsCreatingGroup}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription>
                  Add a new group to the tournament
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="group-name">Group Name</Label>
                  <Input
                    id="group-name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g., Group A, Pool 1"
                  />
                </div>
                <div>
                  <Label htmlFor="advance-teams">Teams Advancing</Label>
                  <Select
                    value={newGroupAdvanceTeams.toString()}
                    onValueChange={(value) => setNewGroupAdvanceTeams(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Team</SelectItem>
                      <SelectItem value="2">2 Teams</SelectItem>
                      <SelectItem value="3">3 Teams</SelectItem>
                      <SelectItem value="4">4 Teams</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreatingGroup(false)}>
                  Cancel
                </Button>
                <Button onClick={createGroup}>
                  <Save className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {groups.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Groups Created</h3>
            <p className="text-muted-foreground mb-4">
              Create your first group to start organizing teams
            </p>
            <Button onClick={() => setIsCreatingGroup(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Group
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group, index) => (
              <Card key={group.id} className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => reorderGroups(index, index - 1)}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => reorderGroups(index, index + 1)}
                          disabled={index === groups.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <div>
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline">
                            {group.teams.length} teams
                          </Badge>
                          <Badge variant="secondary">
                            {group.advance_teams} advance
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingGroup(group.id)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteGroup(group.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Teams in Group</h4>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Team
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Team to {group.name}</DialogTitle>
                            <DialogDescription>
                              Select a team to add to this group
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            {availableTeams.length === 0 ? (
                              <p className="text-muted-foreground text-center py-4">
                                No available teams to add
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {availableTeams.map((team) => (
                                  <div
                                    key={team.id}
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                  >
                                    <div className="flex items-center space-x-3">
                                      {team.logo_url && (
                                        <img
                                          src={team.logo_url}
                                          alt={team.name}
                                          className="h-8 w-8 rounded-full object-cover"
                                        />
                                      )}
                                      <span className="font-medium">{team.name}</span>
                                    </div>
                                    <Button
                                      size="sm"
                                      onClick={() => assignTeamToGroup(team.id, group.name)}
                                    >
                                      Add
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    {group.teams.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        No teams assigned to this group yet
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {group.teams.map((tournamentTeam) => (
                          <div
                            key={tournamentTeam.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              {tournamentTeam.team?.logo_url && (
                                <img
                                  src={tournamentTeam.team.logo_url}
                                  alt={tournamentTeam.team.name}
                                  className="h-6 w-6 rounded-full object-cover"
                                />
                              )}
                              <span className="font-medium">
                                {tournamentTeam.team?.name || 'Unknown Team'}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTeamFromGroup(tournamentTeam.team_id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
