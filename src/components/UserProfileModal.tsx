'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Image from 'next/image'

interface UserInfo {
  id: string
  nickname: string
  name: string | null
  avatar_url: string | null
  role?: string
  created_at?: string
}

interface Props {
  userId: string
  onClose: () => void
}

export default function UserProfileModal({ userId, onClose }: Props) {
  const [user, setUser] = useState<UserInfo | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('users').select('id, nickname, name, avatar_url, role, created_at').eq('id', userId).single()
      .then(({ data }) => { if (data) setUser(data as UserInfo) })
  }, [userId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-zinc-800 border border-zinc-700 rounded-2xl p-6 w-full max-w-xs flex flex-col items-center gap-4 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-200 transition-colors text-lg leading-none"
        >
          ✕
        </button>

        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-zinc-700 border-2 border-zinc-600 flex-shrink-0">
          {user?.avatar_url ? (
            <Image src={user.avatar_url} alt={user.nickname} fill className="object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl text-zinc-400">👤</div>
          )}
        </div>

        {user ? (
          <div className="flex flex-col items-center gap-1 w-full">
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <p className="text-lg font-bold text-white">{user.nickname}</p>
              {user.role && (
                <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${
                  user.role === 'admin' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                  user.role === 'former' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' :
                  'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}>
                  {user.role === 'admin' ? '관리자' : user.role === 'former' ? '전멤버' : '멤버'}
                </span>
              )}
            </div>
            {user.name && <p className="text-sm text-zinc-400">{user.name}</p>}
            {user.created_at && (
              <p className="text-xs text-zinc-500 mt-1">
                {new Date(user.created_at).toLocaleDateString('ko-KR')} 가입
              </p>
            )}
          </div>
        ) : (
          <p className="text-zinc-500 text-sm">불러오는 중...</p>
        )}
      </div>
    </div>
  )
}
