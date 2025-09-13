export interface ResultSubmission {
  id: string
  match_id: string
  submitted_by: string
  submitted_at: string
  home_goals: number
  away_goals: number
  notes?: string | null
  evidence_url?: string | null
  status: 'pending' | 'approved' | 'rejected'
}

export interface ResultApproval {
  id: string
  submission_id: string
  approver_id: string
  approved_at?: string | null
  decision: 'approved' | 'rejected'
  reason?: string | null
}

export interface MatchDispute {
  id: string
  match_id: string
  raised_by: string
  raised_at: string
  title: string
  description?: string | null
  evidence_url?: string | null
  status: 'open' | 'under_review' | 'resolved' | 'dismissed'
  resolution_notes?: string | null
  resolved_by?: string | null
  resolved_at?: string | null
}

export class MatchResultService {
  constructor(private supabase: any) {}

  async listSubmissions(matchId: string): Promise<ResultSubmission[]> {
    const { data, error } = await this.supabase
      .from('match_result_submissions')
      .select('*')
      .eq('match_id', matchId)
      .order('submitted_at', { ascending: false })
    if (error) {
      console.error('listSubmissions error', error)
      return []
    }
    return data || []
  }

  async submitResult(payload: {
    match_id: string
    home_goals: number
    away_goals: number
    notes?: string
    evidence_url?: string
  }): Promise<{ success: boolean; error?: string }>{
    const { error } = await this.supabase
      .from('match_result_submissions')
      .insert({ ...payload })
    if (error) {
      console.error('submitResult error', error)
      return { success: false, error: 'Failed to submit result' }
    }
    return { success: true }
  }

  async approveSubmission(submissionId: string, decision: 'approved' | 'rejected', reason?: string): Promise<{ success: boolean; error?: string }>{
    // create approval row
    const { error: insErr } = await this.supabase
      .from('match_result_approvals')
      .insert({ submission_id: submissionId, decision, reason })
    if (insErr) {
      console.error('approve insert error', insErr)
      return { success: false, error: 'Failed to record approval' }
    }

    // update submission status
    const { error: updErr } = await this.supabase
      .from('match_result_submissions')
      .update({ status: decision === 'approved' ? 'approved' : 'rejected' })
      .eq('id', submissionId)
    if (updErr) {
      console.error('approve update submission error', updErr)
      return { success: false, error: 'Failed to update submission status' }
    }

    // if approved, optionally update matches table final score (if your schema stores it)
    // Could fetch submission and write to matches.final_home_goals/final_away_goals if present
    return { success: true }
  }

  async raiseDispute(payload: {
    match_id: string
    title: string
    description?: string
    evidence_url?: string
  }): Promise<{ success: boolean; error?: string }>{
    const { error } = await this.supabase
      .from('match_disputes')
      .insert({ ...payload })
    if (error) {
      console.error('raiseDispute error', error)
      return { success: false, error: 'Failed to raise dispute' }
    }
    return { success: true }
  }

  async listDisputes(matchId: string): Promise<MatchDispute[]>{
    const { data, error } = await this.supabase
      .from('match_disputes')
      .select('*')
      .eq('match_id', matchId)
      .order('raised_at', { ascending: false })
    if (error) {
      console.error('listDisputes error', error)
      return []
    }
    return data || []
  }

  async resolveDispute(disputeId: string, resolution: {
    status: 'resolved' | 'dismissed'
    resolution_notes?: string
  }): Promise<{ success: boolean; error?: string }>{
    const { error } = await this.supabase
      .from('match_disputes')
      .update({ status: resolution.status, resolution_notes: resolution.resolution_notes, resolved_at: new Date().toISOString() })
      .eq('id', disputeId)
    if (error) {
      console.error('resolveDispute error', error)
      return { success: false, error: 'Failed to resolve dispute' }
    }
    return { success: true }
  }
}

export const matchResultService = new MatchResultService(null as any)


