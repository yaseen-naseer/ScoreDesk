import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, anonKey)

  const { data: match, error } = await supabase
    .from('matches')
    .select(`
      id, status, home_score, away_score, scheduled_date,
      home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
      away_team:teams!matches_away_team_id_fkey(id, name, logo_url)
    `)
    .eq('id', params.id)
    .single()

  if (error) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: match.id,
    status: match.status,
    home: { id: match.home_team?.id, name: match.home_team?.name, score: match.home_score, logo_url: match.home_team?.logo_url },
    away: { id: match.away_team?.id, name: match.away_team?.name, score: match.away_score, logo_url: match.away_team?.logo_url },
    scheduled_date: match.scheduled_date
  })
}


