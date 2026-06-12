'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  async function handleGuestLogin() {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInAnonymously()
    if (error) {
      setError('방문객 접속에 실패했습니다.')
      setLoading(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm bg-zinc-800 border border-zinc-700 rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-white">Ait 놀이터 로그인</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-300">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
              placeholder="example@email.com"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-300">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
              placeholder="비밀번호 입력"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-zinc-100 text-zinc-900 rounded-lg py-2 text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 h-px bg-zinc-700" />
          <span className="text-xs text-zinc-600">또는</span>
          <div className="flex-1 h-px bg-zinc-700" />
        </div>
        <button
          type="button"
          onClick={handleGuestLogin}
          disabled={loading}
          className="w-full border border-zinc-600 text-zinc-400 rounded-lg py-2 text-sm hover:border-zinc-400 hover:text-zinc-200 disabled:opacity-50 transition-colors"
        >
          방문객으로 접속
        </button>
        <p className="text-center text-sm text-zinc-500 mt-2">
          우리 밴드는 처음이니?{' '}
          <Link href="/signup" className="text-zinc-400 hover:text-white hover:underline transition-colors">회원가입</Link>
        </p>
      </div>
    </main>
  )
}
