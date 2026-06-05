'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Image from 'next/image'
import { validateImageFile } from '@/lib/validateUpload'

interface UserRow {
  id: string
  nickname: string
  name: string | null
  email: string
  phone: string | null
  avatar_url: string | null
  role: string
  created_at: string
  last_seen_at: string | null
}

export default function AdminAccounts() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ nickname: '', name: '', email: '', phone: '' })
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function fetchUsers() {
    const supabase = createClient()
    const { data } = await supabase
      .from('users')
      .select('id, nickname, name, email, phone, avatar_url, role, created_at, last_seen_at')
      .order('created_at', { ascending: false })
    if (data) setUsers(data as UserRow[])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  async function toggleRole(user: UserRow) {
    const newRole = user.role === 'admin' ? 'member' : 'admin'
    const supabase = createClient()
    await supabase.from('users').update({ role: newRole }).eq('id', user.id)
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u))
  }

  function startEdit(user: UserRow) {
    setEditingId(user.id)
    setEditForm({ nickname: user.nickname, name: user.name ?? '', email: user.email, phone: user.phone ?? '' })
    setEditAvatarUrl(user.avatar_url)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm({ nickname: '', name: '', email: '', phone: '' })
    setEditAvatarUrl(null)
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>, userId: string) {
    const file = e.target.files?.[0]
    if (!file) return
    const err = validateImageFile(file)
    if (err) { alert(err); return }
    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `avatars/${userId}.${ext}`
    const { error } = await supabase.storage.from('profiles').upload(path, file, { upsert: true })
    if (!error) {
      const { data: urlData } = supabase.storage.from('profiles').getPublicUrl(path)
      setEditAvatarUrl(urlData.publicUrl)
    }
    setUploading(false)
  }

  async function handleSave(userId: string) {
    if (!editForm.nickname.trim()) return
    setSaving(true)
    const supabase = createClient()
    const updated = {
      nickname: editForm.nickname.trim(),
      name: editForm.name.trim() || null,
      email: editForm.email.trim(),
      phone: editForm.phone.trim() || null,
      avatar_url: editAvatarUrl,
    }
    await supabase.from('users').update(updated).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updated } : u))
    cancelEdit()
    setSaving(false)
  }

  const inputClass = "bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 w-full"

  if (loading) return <p className="text-zinc-400">불러오는 중...</p>

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">멤버 관리</h1>
      <div className="flex flex-col gap-3">
        {users.length === 0 && (
          <p className="text-center text-zinc-500 py-10 bg-zinc-800 border border-zinc-700 rounded-xl">계정이 없습니다.</p>
        )}
        {users.map((user) => (
          <div key={user.id} className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden hover:border-zinc-600 transition-colors">

            {/* 기본 정보 행 */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-zinc-700 border border-zinc-600 flex-shrink-0">
                  {user.avatar_url ? (
                    <Image src={user.avatar_url} alt={user.nickname} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400 text-lg">👤</div>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-zinc-100">{user.nickname}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${
                      user.role === 'admin'
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                        : 'bg-zinc-700 border-zinc-600 text-zinc-400'
                    }`}>
                      {user.role === 'admin' ? '관리자' : '멤버'}
                    </span>
                  </div>
                  {user.name && <span className="text-xs text-zinc-400">{user.name}</span>}
                  <span className="text-xs text-zinc-500 truncate">{user.email}</span>
                  {user.phone && <span className="text-xs text-zinc-500">{user.phone}</span>}
                  <span className="text-xs text-zinc-600">가입: {new Date(user.created_at).toLocaleDateString('ko-KR')}</span>
                  <span className="text-xs text-zinc-500">
                    최근 접속: {user.last_seen_at
                      ? new Date(user.last_seen_at).toLocaleString('ko-KR')
                      : '기록 없음'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => editingId === user.id ? cancelEdit() : startEdit(user)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    editingId === user.id
                      ? 'border-zinc-500 text-zinc-300 hover:border-zinc-400'
                      : 'border-zinc-600 text-zinc-400 hover:border-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {editingId === user.id ? '닫기' : '수정'}
                </button>
                <button
                  onClick={() => toggleRole(user)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-zinc-600 hover:border-zinc-400 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {user.role === 'admin' ? '멤버로 변경' : '관리자로 변경'}
                </button>
              </div>
            </div>

            {/* 편집 폼 */}
            {editingId === user.id && (
              <div className="border-t border-zinc-700 bg-zinc-900 p-4 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-5">
                  {/* 아바타 */}
                  <div className="flex flex-col items-center gap-2 flex-shrink-0">
                    <div
                      className="relative w-20 h-20 rounded-full overflow-hidden bg-zinc-700 border-2 border-zinc-600 cursor-pointer hover:border-zinc-400 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {editAvatarUrl ? (
                        <Image src={editAvatarUrl} alt="" fill className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl text-zinc-500">👤</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-600 hover:border-zinc-400 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {uploading ? '업로드 중...' : '이미지 변경'}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleAvatarChange(e, user.id)}
                    />
                  </div>

                  {/* 텍스트 필드 */}
                  <div className="flex flex-col gap-3 flex-1 min-w-0">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-zinc-400 font-medium">닉네임 *</label>
                      <input
                        type="text"
                        value={editForm.nickname}
                        onChange={e => setEditForm(f => ({ ...f, nickname: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-zinc-400 font-medium">이름</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="실명"
                        className={inputClass}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-zinc-400 font-medium">이메일</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-zinc-400 font-medium">전화번호</label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="010-0000-0000"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={cancelEdit}
                    className="text-xs px-4 py-2 rounded-lg border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => handleSave(user.id)}
                    disabled={saving || !editForm.nickname.trim() || uploading}
                    className="text-xs px-4 py-2 rounded-lg bg-zinc-100 text-zinc-900 font-semibold hover:bg-white disabled:opacity-50 transition-colors"
                  >
                    {saving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
