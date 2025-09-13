'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Save, Settings, Trophy, Target } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { GroupAdvancementService, AdvancementRule, TiebreakerRule } from '@/lib/services/group-advancement-service'

interface GroupAdvancementRulesManagerProps {
  tournamentId: string
  groupId: string
  groupName: string
  onRulesUpdated: () => void
}

export function GroupAdvancementRulesManager({
  tournamentId,
  groupId,
  groupName,
  onRulesUpdated
}: GroupAdvancementRulesManagerProps) {
  const { toast } = useToast()
  const advancementService = new GroupAdvancementService()
  
  const [advancementRules, setAdvancementRules] = useState<AdvancementRule[]>([])
  const [tiebreakerRules, setTiebreakerRules] = useState<TiebreakerRule[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreatingAdvancementRule, setIsCreatingAdvancementRule] = useState(false)
  const [isCreatingTiebreakerRule, setIsCreatingTiebreakerRule] = useState(false)
  
  // New rule form states
  const [newAdvancementRule, setNewAdvancementRule] = useState({
    rule_type: 'points' as const,
    priority: 1,
    is_active: true
  })
  
  const [newTiebreakerRule, setNewTiebreakerRule] = useState({
    rule_type: 'head_to_head' as const,
    priority: 1,
    is_active: true
  })

  useEffect(() => {
    loadRules()
  }, [tournamentId, groupId])

  const loadRules = async () => {
    try {
      setLoading(true)
      // For now, we'll use default rules since the database tables don't exist yet
      setAdvancementRules([
        {
          id: 'points',
          tournament_id: tournamentId,
          group_id: groupId,
          rule_type: 'points',
          priority: 1,
          is_active: true
        },
        {
          id: 'goal_difference',
          tournament_id: tournamentId,
          group_id: groupId,
          rule_type: 'goal_difference',
          priority: 2,
          is_active: true
        },
        {
          id: 'goals_scored',
          tournament_id: tournamentId,
          group_id: groupId,
          rule_type: 'goals_scored',
          priority: 3,
          is_active: true
        }
      ])
      
      setTiebreakerRules([
        {
          id: 'head_to_head',
          tournament_id: tournamentId,
          group_id: groupId,
          rule_type: 'head_to_head',
          priority: 1,
          is_active: true
        },
        {
          id: 'goal_difference',
          tournament_id: tournamentId,
          group_id: groupId,
          rule_type: 'goal_difference',
          priority: 2,
          is_active: true
        },
        {
          id: 'goals_scored',
          tournament_id: tournamentId,
          group_id: groupId,
          rule_type: 'goals_scored',
          priority: 3,
          is_active: true
        },
        {
          id: 'random',
          tournament_id: tournamentId,
          group_id: groupId,
          rule_type: 'random',
          priority: 4,
          is_active: true
        }
      ])
    } catch (error) {
      console.error('Error loading rules:', error)
      toast({
        title: 'Error',
        description: 'Failed to load advancement rules',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const createAdvancementRule = async () => {
    try {
      const newRule: AdvancementRule = {
        id: `rule_${Date.now()}`,
        tournament_id: tournamentId,
        group_id: groupId,
        ...newAdvancementRule
      }
      
      setAdvancementRules(prev => [...prev, newRule])
      
      toast({
        title: 'Success',
        description: 'Advancement rule created successfully'
      })
      
      setIsCreatingAdvancementRule(false)
      setNewAdvancementRule({
        rule_type: 'points',
        priority: advancementRules.length + 1,
        is_active: true
      })
      onRulesUpdated()
    } catch (error) {
      console.error('Error creating advancement rule:', error)
      toast({
        title: 'Error',
        description: 'Failed to create advancement rule',
        variant: 'destructive'
      })
    }
  }

  const createTiebreakerRule = async () => {
    try {
      const newRule: TiebreakerRule = {
        id: `tiebreaker_${Date.now()}`,
        tournament_id: tournamentId,
        group_id: groupId,
        ...newTiebreakerRule
      }
      
      setTiebreakerRules(prev => [...prev, newRule])
      
      toast({
        title: 'Success',
        description: 'Tiebreaker rule created successfully'
      })
      
      setIsCreatingTiebreakerRule(false)
      setNewTiebreakerRule({
        rule_type: 'head_to_head',
        priority: tiebreakerRules.length + 1,
        is_active: true
      })
      onRulesUpdated()
    } catch (error) {
      console.error('Error creating tiebreaker rule:', error)
      toast({
        title: 'Error',
        description: 'Failed to create tiebreaker rule',
        variant: 'destructive'
      })
    }
  }

  const deleteAdvancementRule = async (ruleId: string) => {
    try {
      setAdvancementRules(prev => prev.filter(rule => rule.id !== ruleId))
      
      toast({
        title: 'Success',
        description: 'Advancement rule deleted successfully'
      })
      
      onRulesUpdated()
    } catch (error) {
      console.error('Error deleting advancement rule:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete advancement rule',
        variant: 'destructive'
      })
    }
  }

  const deleteTiebreakerRule = async (ruleId: string) => {
    try {
      setTiebreakerRules(prev => prev.filter(rule => rule.id !== ruleId))
      
      toast({
        title: 'Success',
        description: 'Tiebreaker rule deleted successfully'
      })
      
      onRulesUpdated()
    } catch (error) {
      console.error('Error deleting tiebreaker rule:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete tiebreaker rule',
        variant: 'destructive'
      })
    }
  }

  const toggleRuleStatus = async (ruleId: string, type: 'advancement' | 'tiebreaker') => {
    try {
      if (type === 'advancement') {
        setAdvancementRules(prev => prev.map(rule => 
          rule.id === ruleId ? { ...rule, is_active: !rule.is_active } : rule
        ))
      } else {
        setTiebreakerRules(prev => prev.map(rule => 
          rule.id === ruleId ? { ...rule, is_active: !rule.is_active } : rule
        ))
      }
      
      toast({
        title: 'Success',
        description: 'Rule status updated successfully'
      })
      
      onRulesUpdated()
    } catch (error) {
      console.error('Error updating rule status:', error)
      toast({
        title: 'Error',
        description: 'Failed to update rule status',
        variant: 'destructive'
      })
    }
  }

  const getRuleDescription = (ruleType: string) => {
    switch (ruleType) {
      case 'points':
        return 'Teams ranked by total points (3 for win, 1 for draw)'
      case 'goal_difference':
        return 'Teams ranked by goal difference (goals for - goals against)'
      case 'goals_scored':
        return 'Teams ranked by total goals scored'
      case 'goals_conceded':
        return 'Teams ranked by fewest goals conceded'
      case 'head_to_head':
        return 'Teams ranked by head-to-head record'
      case 'random':
        return 'Random selection for tied teams'
      default:
        return 'Custom rule'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Advancement Rules</CardTitle>
          <CardDescription>Loading rules...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Advancement Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-5 w-5" />
                <span>Advancement Rules</span>
              </CardTitle>
              <CardDescription>
                Rules for determining which teams advance from {groupName}
              </CardDescription>
            </div>
            <Dialog open={isCreatingAdvancementRule} onOpenChange={setIsCreatingAdvancementRule}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Advancement Rule</DialogTitle>
                  <DialogDescription>
                    Add a new rule for determining team advancement
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="rule-type">Rule Type</Label>
                    <Select
                      value={newAdvancementRule.rule_type}
                      onValueChange={(value: any) => setNewAdvancementRule(prev => ({ ...prev, rule_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="points">Points</SelectItem>
                        <SelectItem value="goal_difference">Goal Difference</SelectItem>
                        <SelectItem value="goals_scored">Goals Scored</SelectItem>
                        <SelectItem value="goals_conceded">Goals Conceded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      min="1"
                      value={newAdvancementRule.priority}
                      onChange={(e) => setNewAdvancementRule(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreatingAdvancementRule(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createAdvancementRule}>
                    <Save className="h-4 w-4 mr-2" />
                    Add Rule
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {advancementRules.map((rule, index) => (
              <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline">{rule.priority}</Badge>
                  <div>
                    <div className="font-medium capitalize">
                      {rule.rule_type.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getRuleDescription(rule.rule_type)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={rule.is_active ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleRuleStatus(rule.id, 'advancement')}
                  >
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteAdvancementRule(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tiebreaker Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Tiebreaker Rules</span>
              </CardTitle>
              <CardDescription>
                Rules for breaking ties when teams have equal advancement criteria
              </CardDescription>
            </div>
            <Dialog open={isCreatingTiebreakerRule} onOpenChange={setIsCreatingTiebreakerRule}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Tiebreaker Rule</DialogTitle>
                  <DialogDescription>
                    Add a new rule for breaking ties between teams
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="tiebreaker-type">Rule Type</Label>
                    <Select
                      value={newTiebreakerRule.rule_type}
                      onValueChange={(value: any) => setNewTiebreakerRule(prev => ({ ...prev, rule_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="head_to_head">Head to Head</SelectItem>
                        <SelectItem value="goal_difference">Goal Difference</SelectItem>
                        <SelectItem value="goals_scored">Goals Scored</SelectItem>
                        <SelectItem value="goals_conceded">Goals Conceded</SelectItem>
                        <SelectItem value="random">Random</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="tiebreaker-priority">Priority</Label>
                    <Input
                      id="tiebreaker-priority"
                      type="number"
                      min="1"
                      value={newTiebreakerRule.priority}
                      onChange={(e) => setNewTiebreakerRule(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreatingTiebreakerRule(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createTiebreakerRule}>
                    <Save className="h-4 w-4 mr-2" />
                    Add Rule
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tiebreakerRules.map((rule, index) => (
              <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline">{rule.priority}</Badge>
                  <div>
                    <div className="font-medium capitalize">
                      {rule.rule_type.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getRuleDescription(rule.rule_type)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={rule.is_active ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleRuleStatus(rule.id, 'tiebreaker')}
                  >
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteTiebreakerRule(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
