'use client'

import { useRouter } from 'next/navigation'
import { TournamentCreationForm } from '@/components/tournament'

export default function CreateTournamentPage() {
  const router = useRouter()

  const handleSuccess = (tournamentId: string) => {
    router.push(`/tournaments/${tournamentId}`)
  }

  const handleCancel = () => {
    router.push('/tournaments')
  }

  return (
    <div className="container mx-auto py-6">
      <TournamentCreationForm 
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  )
}
