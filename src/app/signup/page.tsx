'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '', passwordConfirm: '', nickname: '', inviteCode: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    if (form.password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }
    if (!form.nickname.trim()) {
      setError('닉네임을 입력해주세요.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    // 1. 초대 코드 확인
    const { data: codeData } = await supabase
      .from('invite_codes')
      .select('id, is_active')
      .eq('code', form.inviteCode.trim().toUpperCase())
      .maybeSingle()

    if (!codeData || !codeData.is_active) {
      setError('유효하지 않은 초대 코드입니다.')
      setLoading(false)
      return
    }

    // 2. 닉네임 중복 확인
    const { data: existingNick } = await supabase
      .from('users')
      .select('id')
      .eq('nickname', form.nickname.trim())
      .maybeSingle()

    if (existingNick) {
      setError('이미 사용 중인 닉네임입니다.')
      setLoading(false)
      return
    }

    // 3. 이메일 중복 확인
    const { data: existingEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', form.email.trim())
      .maybeSingle()

    if (existingEmail) {
      setError('이미 사용 중인 이메일입니다.')
      setLoading(false)
      return
    }

    // 4. Auth 계정 생성
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (signUpError || !authData.user) {
      setError('가입에 실패했습니다. 다시 시도해주세요.')
      setLoading(false)
      return
    }

    // 5. users 테이블 row 생성
    const { error: insertError } = await supabase.from('users').insert({
      id: authData.user.id,
      email: form.email,
      nickname: form.nickname.trim(),
      role: 'member',
    })

    if (insertError) {
      setError('계정 생성에 실패했습니다. 다시 시도해주세요.')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  const inputClass = "border border-zinc-600 bg-zinc-900 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 w-full"

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl p-8 flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">🎸 Ait 가입</h1>
          <p className="text-sm text-zinc-500 mt-1">초대 코드가 있어야 가입할 수 있습니다</p>
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">초대 코드 *</label>
            <input
              type="text"
              value={form.inviteCode}
              onChange={e => setForm(f => ({ ...f, inviteCode: e.target.value }))}
              required
              placeholder="초대 코드 입력"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">닉네임 *</label>
            <input
              type="text"
              value={form.nickname}
              onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
              required
              placeholder="사용할 닉네임"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">이메일 *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
              placeholder="example@email.com"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">비밀번호 *</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
              placeholder="6자 이상"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">비밀번호 확인 *</label>
            <input
              type="password"
              value={form.passwordConfirm}
              onChange={e => setForm(f => ({ ...f, passwordConfirm: e.target.value }))}
              required
              placeholder="비밀번호 재입력"
              className={inputClass}
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-zinc-100 text-zinc-900 rounded-lg py-2.5 text-sm font-semibold hover:bg-white disabled:opacity-50 transition-colors"
          >
            {loading ? '가입 중...' : '가입하기'}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-zinc-300 hover:text-white transition-colors">로그인</Link>
        </p>
      </div>
    </main>
  )
}
