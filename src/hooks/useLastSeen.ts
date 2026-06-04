'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export function useLastSeen(userId: string | null) {
  useEffect(() => {
    if (!userId) return

    async function update() {
      const supabase = createClient()
      await supabase.from('users').update({ last_seen_at: new Date().toISOString() }).eq('id', userId!)
    }

    update()

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') update()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [userId])
}
