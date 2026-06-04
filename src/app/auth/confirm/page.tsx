'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ConfirmPage() {
  const router = useRouter()
  const supabase = createClient()

  const [ready, setReady] = useState(false)
  const [isInvite, setIsInvite] = useState(false)
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    const params = new URLSearchParams(hash.replace('#', '?'))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')

    if (accessToken && refreshToken) {
      if (type === 'invite') setIsInvite(true)
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(() => setReady(true))
    } else {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setReady(true)
        else router.push('/login')
      })
    }
  }, [])

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (isInvite && !nickname.trim()) {
      setError('닉네임을 입력해주세요.')
      return
    }

    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('비밀번호는 8자 이상이며 영문과 숫자를 포함해야 합니다.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError('비밀번호 설정에 실패했습니다. 다시 시도해주세요.')
      setLoading(false)
      return
    }

    if (isInvite) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('users').update({ nickname: nickname.trim() }).eq('id', user.id)
      }
    }

    router.push('/')
    router.refresh()
  }

  const inputClass = "bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 w-full"

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-zinc-500">인증 확인 중...</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm bg-zinc-800 border border-zinc-700 rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-center mb-2 text-white">
          {isInvite ? '초대 수락' : '비밀번호 설정'}
        </h1>
        <p className="text-sm text-zinc-500 text-center mb-6">
          {isInvite ? '닉네임과 비밀번호를 설정해주세요.' : '처음 로그인하셨습니다. 사용할 비밀번호를 설정해주세요.'}
        </p>
        <form onSubmit={handleSetPassword} className="flex flex-col gap-4">
          {isInvite && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-zinc-300">닉네임</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
                className={inputClass}
                placeholder="사용할 닉네임"
              />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-300">새 비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputClass}
              placeholder="8자 이상, 영문+숫자 포함"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-300">비밀번호 확인</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className={inputClass}
              placeholder="비밀번호 재입력"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-zinc-100 text-zinc-900 rounded-lg py-2 text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors"
          >
            {loading ? '설정 중...' : (isInvite ? '완료' : '비밀번호 설정')}
          </button>
        </form>
      </div>
    </main>
  )
}
