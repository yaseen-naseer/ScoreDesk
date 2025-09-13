'use client'

import { useEffect, useState } from 'react'
import { Check, FileText, Users, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { EntryRequirementsSettings, entryRequirementsService } from '@/lib/services/entry-requirements-service'

interface EntryRequirementsManagerProps {
  tournamentId: string
  tournamentName: string
  onUpdate?: () => void
}

export function EntryRequirementsManager({ tournamentId, tournamentName, onUpdate }: EntryRequirementsManagerProps) {
  const { toast } = useToast()
  const [settings, setSettings] = useState<EntryRequirementsSettings | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [newDoc, setNewDoc] = useState('')

  useEffect(() => {
    load()
  }, [tournamentId])

  const load = async () => {
    const data = await entryRequirementsService.getSettings(tournamentId)
    setSettings({
      max_teams: data?.max_teams ?? undefined,
      min_players_per_team: data?.min_players_per_team ?? 5,
      max_players_per_team: data?.max_players_per_team ?? 25,
      require_team_documents: data?.require_team_documents ?? false,
      required_documents: (data?.required_documents as any) ?? [],
      require_team_approval: data?.require_team_approval ?? false,
      allow_waitlist: data?.allow_waitlist ?? true,
      waitlist_limit: data?.waitlist_limit ?? null,
      require_coach_license: data?.require_coach_license ?? false,
      min_player_age: data?.min_player_age ?? null,
      max_player_age: data?.max_player_age ?? null,
      duplicate_player_policy: (data?.duplicate_player_policy as any) ?? 'disallow',
      entry_rules_notes: data?.entry_rules_notes ?? null,
    })
  }

  const save = async () => {
    if (!settings) return
    setIsSaving(true)
    const ok = await entryRequirementsService.updateSettings(tournamentId, settings)
    setIsSaving(false)
    if (ok) {
      toast({ title: 'Saved', description: 'Entry requirements updated' })
      onUpdate?.()
    } else {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' })
    }
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Entry Requirements</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const addDocument = () => {
    if (!newDoc.trim()) return
    setSettings({ ...settings, required_documents: [...(settings.required_documents || []), newDoc.trim()] })
    setNewDoc('')
  }

  const removeDocument = (doc: string) => {
    setSettings({ ...settings, required_documents: (settings.required_documents || []).filter(d => d !== doc) })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entry Requirements & Team Limits</CardTitle>
        <CardDescription>Control who can enter and roster size limits for {tournamentName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Maximum Teams</Label>
              <Input
                type="number"
                value={settings.max_teams ?? ''}
                onChange={(e) => setSettings({ ...settings, max_teams: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="e.g. 16"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Players/Team</Label>
                <Input
                  type="number"
                  value={settings.min_players_per_team ?? 5}
                  onChange={(e) => setSettings({ ...settings, min_players_per_team: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Players/Team</Label>
                <Input
                  type="number"
                  value={settings.max_players_per_team ?? 25}
                  onChange={(e) => setSettings({ ...settings, max_players_per_team: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Waitlist Enabled</Label>
                <div className="text-sm text-muted-foreground">Allow registering beyond max teams</div>
              </div>
              <Switch
                checked={!!settings.allow_waitlist}
                onCheckedChange={(v) => setSettings({ ...settings, allow_waitlist: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>Waitlist Limit</Label>
              <Input
                type="number"
                value={settings.waitlist_limit ?? ''}
                onChange={(e) => setSettings({ ...settings, waitlist_limit: e.target.value ? Number(e.target.value) : null })}
                placeholder="e.g. 4"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Require Team Approval</Label>
                <div className="text-sm text-muted-foreground">Admins must approve teams before entry</div>
              </div>
              <Switch
                checked={!!settings.require_team_approval}
                onCheckedChange={(v) => setSettings({ ...settings, require_team_approval: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Require Coach License</Label>
                <div className="text-sm text-muted-foreground">Coach must have valid license</div>
              </div>
              <Switch
                checked={!!settings.require_coach_license}
                onCheckedChange={(v) => setSettings({ ...settings, require_coach_license: v })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Player Age</Label>
                <Input
                  type="number"
                  value={settings.min_player_age ?? ''}
                  onChange={(e) => setSettings({ ...settings, min_player_age: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Player Age</Label>
                <Input
                  type="number"
                  value={settings.max_player_age ?? ''}
                  onChange={(e) => setSettings({ ...settings, max_player_age: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Require Team Documents</Label>
              <div className="text-sm text-muted-foreground">Upload list of required documents</div>
            </div>
            <Switch
              checked={!!settings.require_team_documents}
              onCheckedChange={(v) => setSettings({ ...settings, require_team_documents: v })}
            />
          </div>

          <div className="flex space-x-2">
            <Input
              placeholder="e.g. Player ID copies"
              value={newDoc}
              onChange={(e) => setNewDoc(e.target.value)}
            />
            <Button type="button" onClick={addDocument}>Add</Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(settings.required_documents || []).map((doc) => (
              <Badge key={doc} variant="secondary" className="flex items-center space-x-2">
                <FileText className="h-3 w-3 mr-1" />
                <span>{doc}</span>
                <Button size="xs" variant="ghost" onClick={() => removeDocument(doc)}>×</Button>
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Notes / Additional Rules</Label>
          <Textarea
            placeholder="Any additional entry rules or notes"
            value={settings.entry_rules_notes ?? ''}
            onChange={(e) => setSettings({ ...settings, entry_rules_notes: e.target.value })}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}


