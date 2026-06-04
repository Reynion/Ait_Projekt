'use client'

import { useEffect } from 'react'
import { getFirebaseMessaging, getToken } from '@/lib/firebase'
import { createClient } from '@/lib/supabase'

export function useFCMToken(userId: string | null) {
  useEffect(() => {
    if (!userId) return

    async function registerToken() {
      const messaging = getFirebaseMessaging()
      if (!messaging) return

      try {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js'),
        })

        if (!token) return

        const supabase = createClient()
        await supabase.from('users').update({ fcm_token: token }).eq('id', userId)
      } catch {
        // 알림 권한 거부 또는 등록 실패 시 무시
      }
    }

    registerToken()
  }, [userId])
}
