'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface InviteCode {
  id: number
  code: string
  is_active: boolean
  created_at: string
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function AdminInviteCodesPage() {
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(true)
  const [newCode, setNewCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function fetchCodes() {
    const supabase = createClient()
    const { data } = await supabase
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setCodes(data as InviteCode[])
    setLoading(false)
  }

  useEffect(() => {
    fetchCodes()
    setNewCode(generateCode())
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newCode.trim()) return
    setError('')
    setSaving(true)
    const supabase = createClient()
    const { error: err } = await supabase.from('invite_codes').insert({ code: newCode.trim().toUpperCase() })
    if (err) {
      setError(err.message.includes('unique') ? '이미 존재하는 코드입니다.' : '생성에 실패했습니다.')
      setSaving(false)
      return
    }
    setNewCode(generateCode())
    setSaving(false)
    fetchCodes()
  }

  async function toggleActive(code: InviteCode) {
    const supabase = createClient()
    const { error: err } = await supabase
      .from('invite_codes')
      .update({ is_active: !code.is_active })
      .eq('id', code.id)
    if (!err) setCodes(prev => prev.map(c => c.id === code.id ? { ...c, is_active: !c.is_active } : c))
  }

  async function handleDelete(id: number) {
    if (!confirm('코드를 삭제하시겠습니까?')) return
    const supabase = createClient()
    const { error: err } = await supabase.from('invite_codes').delete().eq('id', id)
    if (err) { alert('삭제에 실패했습니다.'); return }
    setCodes(prev => prev.filter(c => c.id !== id))
  }

  if (loading) return <p className="text-zinc-400">불러오는 중...</p>

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">초대 코드 관리</h1>

      {/* 코드 생성 */}
      <form onSubmit={handleCreate} className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-zinc-300">새 코드 생성</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCode}
            onChange={e => setNewCode(e.target.value.toUpperCase())}
            placeholder="코드 입력 또는 자동 생성"
            className="flex-1 bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400 font-mono tracking-widest"
          />
          <button
            type="button"
            onClick={() => setNewCode(generateCode())}
            className="text-sm text-zinc-400 border border-zinc-600 hover:border-zinc-400 hover:text-white px-3 py-2 rounded-lg transition-colors flex-shrink-0"
          >
            🔀 랜덤
          </button>
          <button
            type="submit"
            disabled={saving || !newCode.trim()}
            className="bg-zinc-100 text-zinc-900 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-white disabled:opacity-50 transition-colors flex-shrink-0"
          >
            {saving ? '생성 중...' : '생성'}
          </button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>

      {/* 코드 목록 */}
      <div className="flex flex-col gap-3">
        {codes.length === 0 && (
          <div className="text-center text-zinc-500 py-10 bg-zinc-800 border border-zinc-700 rounded-xl">
            생성된 초대 코드가 없습니다.
          </div>
        )}
        {codes.map(code => (
          <div key={code.id} className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className={`font-mono text-base tracking-widest font-semibold flex-1 ${code.is_active ? 'text-white' : 'text-zinc-600 line-through'}`}>
              {code.code}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${code.is_active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-700 text-zinc-500 border-zinc-600'}`}>
              {code.is_active ? '활성' : '비활성'}
            </span>
            <span className="text-xs text-zinc-500 flex-shrink-0 hidden sm:block">
              {new Date(code.created_at).toLocaleDateString('ko-KR')}
            </span>
            <button
              onClick={() => toggleActive(code)}
              className="text-xs text-zinc-400 border border-zinc-600 hover:border-zinc-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
            >
              {code.is_active ? '비활성화' : '활성화'}
            </button>
            <button
              onClick={() => handleDelete(code.id)}
              className="text-xs text-zinc-500 hover:text-red-400 border border-zinc-700 hover:border-red-500/50 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
            >
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
