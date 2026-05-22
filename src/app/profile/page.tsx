'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Navbar from '@/components/Navbar'

interface UserProfile {
  id: string
  nickname: string
  email: string
  phone: string | null
  avatar_url: string | null
}

const inputClass = "bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 w-full"

export default function ProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [nickname, setNickname] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwMessage, setPwMessage] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      const { data: userRow } = await supabase.from('users').select('*').eq('id', data.user.id).single()
      if (userRow) {
        setProfile(userRow)
        setNickname(userRow.nickname)
        setPhone(userRow.phone ?? '')
        setAvatarUrl(userRow.avatar_url)
      }
    })
  }, [router])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `avatars/${profile.id}.${ext}`
    const { error } = await supabase.storage.from('profiles').upload(path, file, { upsert: true })
    if (error) { setMessage('이미지 업로드에 실패했습니다.'); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('profiles').getPublicUrl(path)
    await supabase.from('users').update({ avatar_url: urlData.publicUrl }).eq('id', profile.id)
    setAvatarUrl(urlData.publicUrl)
    setUploading(false)
    setMessage('프로필 이미지가 업데이트됐습니다.')
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    setMessage('')
    const supabase = createClient()
    const { error } = await supabase.from('users').update({ nickname, phone: phone || null }).eq('id', profile.id)
    setSaving(false)
    setMessage(error ? '저장에 실패했습니다.' : '정보가 저장됐습니다.')
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwMessage('')
    if (newPassword !== confirmPassword) { setPwMessage('새 비밀번호가 일치하지 않습니다.'); return }
    if (newPassword.length < 8) { setPwMessage('비밀번호는 8자 이상이어야 합니다.'); return }
    setPwSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwSaving(false)
    if (error) { setPwMessage('비밀번호 변경에 실패했습니다.'); return }
    setPwMessage('비밀번호가 변경됐습니다.')
    setNewPassword('')
    setConfirmPassword('')
  }

  if (!profile) return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950">
      <p className="text-zinc-400">불러오는 중...</p>
    </main>
  )

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      <Navbar />

      <div className="max-w-lg w-full mx-auto px-4 py-10 flex flex-col gap-5">

        {/* 프로필 이미지 */}
        <section className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 flex flex-col items-center gap-4">
          <div
            className="relative w-24 h-24 rounded-full overflow-hidden bg-zinc-700 border-2 border-zinc-600 cursor-pointer hover:border-zinc-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {avatarUrl ? (
              <Image src={avatarUrl} alt="프로필" fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl text-zinc-500">👤</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-600 hover:border-zinc-400 px-3 py-1.5 rounded-lg"
          >
            {uploading ? '업로드 중...' : '이미지 변경'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </section>

        {/* 기본 정보 */}
        <section className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">기본 정보</h2>
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-400">이메일</label>
              <input type="text" value={profile.email} disabled className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-500 cursor-not-allowed w-full" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-300">닉네임</label>
              <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} required className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-300">전화번호</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000" className={inputClass} />
            </div>
            {message && (
              <p className={`text-sm px-3 py-2 rounded-lg border ${
                message.includes('실패')
                  ? 'text-red-400 bg-red-500/10 border-red-500/30'
                  : 'text-green-400 bg-green-500/10 border-green-500/30'
              }`}>{message}</p>
            )}
            <button type="submit" disabled={saving} className="bg-zinc-100 text-zinc-900 rounded-lg py-2.5 text-sm font-semibold hover:bg-white disabled:opacity-50 transition-colors">
              {saving ? '저장 중...' : '저장'}
            </button>
          </form>
        </section>

        {/* 비밀번호 변경 */}
        <section className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">비밀번호 변경</h2>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-300">새 비밀번호</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="8자 이상" className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-300">새 비밀번호 확인</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="비밀번호 재입력" className={inputClass} />
            </div>
            {pwMessage && (
              <p className={`text-sm px-3 py-2 rounded-lg border ${
                pwMessage.includes('실패') || pwMessage.includes('않') || pwMessage.includes('이상')
                  ? 'text-red-400 bg-red-500/10 border-red-500/30'
                  : 'text-green-400 bg-green-500/10 border-green-500/30'
              }`}>{pwMessage}</p>
            )}
            <button type="submit" disabled={pwSaving} className="bg-zinc-100 text-zinc-900 rounded-lg py-2.5 text-sm font-semibold hover:bg-white disabled:opacity-50 transition-colors">
              {pwSaving ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
