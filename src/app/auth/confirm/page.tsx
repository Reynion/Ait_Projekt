'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ConfirmPage() {
  const router = useRouter()
  const supabase = createClient()

  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    const params = new URLSearchParams(hash.replace('#', '?'))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(() => setReady(true))
    } else {
      // 이미 세션이 있는 경우 (재접근 등)
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setReady(true)
        else router.push('/login')
      })
    }
  }, [])

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('비밀번호 설정에 실패했습니다. 다시 시도해주세요.')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <p className="text-zinc-500">인증 확인 중...</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-800 rounded-2xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-2">비밀번호 설정</h1>
        <p className="text-sm text-zinc-500 text-center mb-6">처음 로그인하셨습니다. 사용할 비밀번호를 설정해주세요.</p>
        <form onSubmit={handleSetPassword} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">새 비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:bg-zinc-700 dark:border-zinc-600"
              placeholder="8자 이상"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">비밀번호 확인</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:bg-zinc-700 dark:border-zinc-600"
              placeholder="비밀번호 재입력"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-zinc-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? '설정 중...' : '비밀번호 설정'}
          </button>
        </form>
      </div>
    </main>
  )
}
