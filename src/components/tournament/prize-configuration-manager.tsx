'use client'

import { useEffect, useState } from 'react'
import { DollarSign, Gift, Trophy, Medal, Trash2, Plus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { 
  PrizeConfigurationService, 
  TournamentPrize, 
  TournamentAward, 
  prizeConfigurationService 
} from '@/lib/services/prize-configuration-service'

interface PrizeConfigurationManagerProps {
  tournamentId: string
  tournamentName: string
  onUpdate?: () => void
}

export function PrizeConfigurationManager({ tournamentId, tournamentName, onUpdate }: PrizeConfigurationManagerProps) {
  const { toast } = useToast()
  const [prizes, setPrizes] = useState<TournamentPrize[]>([])
  const [awards, setAwards] = useState<TournamentAward[]>([])
  const [newPrize, setNewPrize] = useState<Partial<TournamentPrize>>({ prize_type: 'cash', position: 1, currency: 'USD', is_team_prize: true })
  const [newAward, setNewAward] = useState<Partial<TournamentAward>>({ award_key: 'mvp', name: 'Most Valuable Player', selection_method: 'committee' })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    load()
  }, [tournamentId])

  const load = async () => {
    const p = await prizeConfigurationService.getPrizes(tournamentId)
    const a = await prizeConfigurationService.getAwards(tournamentId)
    setPrizes(p)
    setAwards(a)
  }

  const addPrize = async () => {
    setIsSaving(true)
    const ok = await prizeConfigurationService.addPrize(tournamentId, newPrize)
    setIsSaving(false)
    if (ok) {
      toast({ title: 'Prize added' })
      await load()
      onUpdate?.()
    } else {
      toast({ title: 'Failed to add prize', variant: 'destructive' })
    }
  }

  const deletePrize = async (id: string) => {
    setIsSaving(true)
    const ok = await prizeConfigurationService.deletePrize(id)
    setIsSaving(false)
    if (ok) {
      toast({ title: 'Prize removed' })
      await load()
      onUpdate?.()
    } else {
      toast({ title: 'Failed to remove prize', variant: 'destructive' })
    }
  }

  const upsertAward = async () => {
    setIsSaving(true)
    const ok = await prizeConfigurationService.upsertAward(tournamentId, newAward)
    setIsSaving(false)
    if (ok) {
      toast({ title: 'Award saved' })
      await load()
      onUpdate?.()
    } else {
      toast({ title: 'Failed to save award', variant: 'destructive' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prizes & Awards</CardTitle>
        <CardDescription>Configure prize money, trophies, and special awards for {tournamentName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Prizes */}
        <div className="space-y-3">
          <div className="font-semibold">Tournament Prizes</div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {prizes.map(prize => (
              <Card key={prize.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{prize.title || `Position ${prize.position}`}</div>
                    <Button size="icon" variant="ghost" onClick={() => deletePrize(prize.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">Type: {prize.prize_type}</div>
                  {prize.amount_cents ? (
                    <div className="text-sm flex items-center space-x-1">
                      <DollarSign className="h-4 w-4" />
                      <span>{(prize.amount_cents / 100).toFixed(2)} {prize.currency}</span>
                    </div>
                  ) : null}
                  {prize.description && (
                    <div className="text-sm text-muted-foreground">{prize.description}</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={(newPrize.prize_type as any) || 'cash'} onValueChange={(v) => setNewPrize({ ...newPrize, prize_type: v as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="trophy">Trophy</SelectItem>
                  <SelectItem value="medal">Medal</SelectItem>
                  <SelectItem value="in_kind">In-kind</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Position</Label>
              <Input type="number" value={newPrize.position ?? ''} onChange={(e) => setNewPrize({ ...newPrize, position: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <Label>Title</Label>
              <Input value={newPrize.title ?? ''} onChange={(e) => setNewPrize({ ...newPrize, title: e.target.value })} placeholder="Winner" />
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" value={newPrize.amount_cents ? (newPrize.amount_cents / 100).toString() : ''} onChange={(e) => setNewPrize({ ...newPrize, amount_cents: e.target.value ? Math.round(Number(e.target.value) * 100) : undefined })} placeholder="e.g. 1000" />
            </div>
            <div className="flex items-end">
              <Button onClick={addPrize} disabled={isSaving}>
                <Plus className="h-4 w-4 mr-2" /> Add Prize
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Awards */}
        <div className="space-y-3">
          <div className="font-semibold">Special Awards</div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {awards.map(award => (
              <Card key={award.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="font-medium">{award.name}</div>
                  <div className="text-sm text-muted-foreground">Key: {award.award_key}</div>
                  {award.description && <div className="text-sm text-muted-foreground">{award.description}</div>}
                  <div className="text-sm">Method: {award.selection_method}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            <div>
              <Label>Key</Label>
              <Input value={newAward.award_key ?? ''} onChange={(e) => setNewAward({ ...newAward, award_key: e.target.value })} placeholder="mvp" />
            </div>
            <div>
              <Label>Name</Label>
              <Input value={newAward.name ?? ''} onChange={(e) => setNewAward({ ...newAward, name: e.target.value })} placeholder="Most Valuable Player" />
            </div>
            <div>
              <Label>Method</Label>
              <Select value={(newAward.selection_method as any) || 'committee'} onValueChange={(v) => setNewAward({ ...newAward, selection_method: v as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="committee">Committee</SelectItem>
                  <SelectItem value="stats">Stats</SelectItem>
                  <SelectItem value="vote">Vote</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={newAward.description ?? ''} onChange={(e) => setNewAward({ ...newAward, description: e.target.value })} />
            </div>
            <div className="flex items-end">
              <Button onClick={upsertAward} disabled={isSaving}>
                <Plus className="h-4 w-4 mr-2" /> Save Award
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


