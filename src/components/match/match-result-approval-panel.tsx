'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Upload } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { matchResultService, ResultSubmission, MatchDispute } from '@/lib/services/match-result-service'

interface MatchResultApprovalPanelProps {
  matchId: string
  onChanged?: () => void
}

export function MatchResultApprovalPanel({ matchId, onChanged }: MatchResultApprovalPanelProps) {
  const { toast } = useToast()
  const [submissions, setSubmissions] = useState<ResultSubmission[]>([])
  const [disputes, setDisputes] = useState<MatchDispute[]>([])
  const [homeGoals, setHomeGoals] = useState('')
  const [awayGoals, setAwayGoals] = useState('')
  const [notes, setNotes] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [disputeTitle, setDisputeTitle] = useState('')
  const [disputeDesc, setDisputeDesc] = useState('')
  const [disputeEvidence, setDisputeEvidence] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    reload()
  }, [matchId])

  const reload = async () => {
    const s = await matchResultService.listSubmissions(matchId)
    const d = await matchResultService.listDisputes(matchId)
    setSubmissions(s)
    setDisputes(d)
  }

  const submitResult = async () => {
    if (!homeGoals || !awayGoals) {
      toast({ title: 'Enter scores', variant: 'destructive' })
      return
    }
    setIsBusy(true)
    const res = await matchResultService.submitResult({
      match_id: matchId,
      home_goals: Number(homeGoals),
      away_goals: Number(awayGoals),
      notes,
      evidence_url: evidenceUrl || undefined,
    })
    setIsBusy(false)
    if (res.success) {
      toast({ title: 'Result submitted' })
      setHomeGoals(''); setAwayGoals(''); setNotes(''); setEvidenceUrl('')
      await reload()
      onChanged?.()
    } else {
      toast({ title: res.error || 'Failed', variant: 'destructive' })
    }
  }

  const approve = async (submissionId: string, decision: 'approved' | 'rejected') => {
    setIsBusy(true)
    const res = await matchResultService.approveSubmission(submissionId, decision)
    setIsBusy(false)
    if (res.success) {
      toast({ title: decision === 'approved' ? 'Approved' : 'Rejected' })
      await reload()
      onChanged?.()
    } else {
      toast({ title: res.error || 'Failed', variant: 'destructive' })
    }
  }

  const raiseDispute = async () => {
    if (!disputeTitle.trim()) {
      toast({ title: 'Enter dispute title', variant: 'destructive' })
      return
    }
    setIsBusy(true)
    const res = await matchResultService.raiseDispute({
      match_id: matchId,
      title: disputeTitle,
      description: disputeDesc || undefined,
      evidence_url: disputeEvidence || undefined,
    })
    setIsBusy(false)
    if (res.success) {
      toast({ title: 'Dispute raised' })
      setDisputeTitle(''); setDisputeDesc(''); setDisputeEvidence('')
      await reload()
      onChanged?.()
    } else {
      toast({ title: res.error || 'Failed', variant: 'destructive' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Result Approval & Disputes</CardTitle>
        <CardDescription>Submit results, approve/reject, and manage disputes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Submit Result */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <Label>Home Goals</Label>
            <Input value={homeGoals} onChange={(e) => setHomeGoals(e.target.value)} type="number" />
          </div>
          <div>
            <Label>Away Goals</Label>
            <Input value={awayGoals} onChange={(e) => setAwayGoals(e.target.value)} type="number" />
          </div>
          <div className="md:col-span-2">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="md:col-span-3">
            <Label>Evidence URL (optional)</Label>
            <Input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="Link to images or video" />
          </div>
          <div>
            <Button onClick={submitResult} disabled={isBusy}>Submit Result</Button>
          </div>
        </div>

        {/* Submissions */}
        <div className="space-y-2">
          <div className="font-medium">Submissions</div>
          <div className="space-y-2">
            {submissions.map(s => (
              <div key={s.id} className="p-3 border rounded flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-sm">{new Date(s.submitted_at).toLocaleString()} • {s.home_goals} - {s.away_goals}</div>
                  {s.notes && <div className="text-xs text-muted-foreground">{s.notes}</div>}
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={s.status === 'approved' ? 'default' : s.status === 'rejected' ? 'destructive' : 'secondary'}>
                    {s.status}
                  </Badge>
                  {s.status === 'pending' && (
                    <>
                      <Button size="sm" onClick={() => approve(s.id, 'approved')}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => approve(s.id, 'rejected')}>
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {submissions.length === 0 && (
              <div className="text-sm text-muted-foreground">No submissions yet.</div>
            )}
          </div>
        </div>

        {/* Disputes */}
        <div className="space-y-2">
          <div className="font-medium">Raise Dispute</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <Label>Title</Label>
              <Input value={disputeTitle} onChange={(e) => setDisputeTitle(e.target.value)} placeholder="e.g., Incorrect score" />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea value={disputeDesc} onChange={(e) => setDisputeDesc(e.target.value)} rows={3} />
            </div>
            <div className="md:col-span-3">
              <Label>Evidence URL (optional)</Label>
              <Input value={disputeEvidence} onChange={(e) => setDisputeEvidence(e.target.value)} />
            </div>
            <div>
              <Button onClick={raiseDispute} disabled={isBusy}>Submit Dispute</Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-medium">Disputes</div>
          <div className="space-y-2">
            {disputes.map(d => (
              <div key={d.id} className="p-3 border rounded">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{d.title}</div>
                  <Badge variant={d.status === 'open' ? 'secondary' : d.status === 'under_review' ? 'outline' : 'default'}>
                    {d.status}
                  </Badge>
                </div>
                {d.description && <div className="text-sm text-muted-foreground mt-1">{d.description}</div>}
                {d.resolution_notes && <div className="text-xs mt-1">Resolution: {d.resolution_notes}</div>}
              </div>
            ))}
            {disputes.length === 0 && (
              <div className="text-sm text-muted-foreground">No disputes.</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


