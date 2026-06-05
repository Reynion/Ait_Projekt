'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'

interface RecordPost {
  id: number
  title: string
  record_date: string
  location: string
  record_type: 'concert' | 'practice' | 'etc' | null
  created_at: string
  users: { nickname: string } | null
}

const TYPE_LABEL: Record<string, string> = { concert: '공연', practice: '연습', etc: '기타' }
const TYPE_STYLE: Record<string, string> = {
  concert: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
  practice: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
  etc: 'bg-zinc-600/50 text-zinc-300 border-zinc-500/30',
}

function AdminRecordsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [records, setRecords] = useState<RecordPost[]>([])
  const [loading, setLoading] = useState(true)

  const [typeFilter, setTypeFilter] = useState<'all' | 'concert' | 'practice' | 'etc'>(() => {
    const t = searchParams.get('type')
    if (t === 'concert' || t === 'practice' || t === 'etc') return t
    return 'all'
  })
  const [searchText, setSearchText] = useState(() => searchParams.get('q') ?? '')
  const [appliedSearch, setAppliedSearch] = useState(() => searchParams.get('q') ?? '')
  const [sort, setSort] = useState<'newest' | 'oldest'>(() => searchParams.get('sort') === 'oldest' ? 'oldest' : 'newest')

  function updateUrl(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') params.delete(key)
      else params.set(key, value)
    })
    if (params.get('type') === 'all') params.delete('type')
    if (params.get('sort') === 'newest') params.delete('sort')
    const qs = params.toString()
    router.push(`${pathname}${qs ? '?' + qs : ''}`, { scroll: false })
  }

  async function fetchRecords() {
    const supabase = createClient()
    const { data } = await supabase.from('record_posts').select('id, title, record_date, location, record_type, created_at, users(nickname)').is('deleted_at', null).order('created_at', { ascending: false })
    if (data) setRecords(data as unknown as RecordPost[])
    setLoading(false)
  }

  useEffect(() => { fetchRecords() }, [])

  function handleTypeChange(val: 'all' | 'concert' | 'practice' | 'etc') {
    setTypeFilter(val)
    updateUrl({ type: val })
  }

  function handleSortChange(val: 'newest' | 'oldest') {
    setSort(val)
    updateUrl({ sort: val })
  }

  function applySearch() {
    setAppliedSearch(searchText)
    updateUrl({ q: searchText || null })
  }

  function clearSearch() {
    setSearchText('')
    setAppliedSearch('')
    updateUrl({ q: null })
  }

  async function handleDelete(id: number) {
    if (!confirm('기록을 삭제하시겠습니까?')) return
    const supabase = createClient()
    const { error } = await supabase.from('record_posts').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) { alert('삭제에 실패했습니다.'); return }
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  const filtered = useMemo(() => {
    let list = [...records]
    if (typeFilter !== 'all') list = list.filter(r => r.record_type === typeFilter)
    if (appliedSearch) {
      const q = appliedSearch.replace(/\s/g, '').toLowerCase()
      list = list.filter(r =>
        r.title.replace(/\s/g, '').toLowerCase().includes(q) ||
        r.location.replace(/\s/g, '').toLowerCase().includes(q) ||
        (r.users?.nickname ?? '').replace(/\s/g, '').toLowerCase().includes(q)
      )
    }
    if (sort === 'oldest') list = list.reverse()
    return list
  }, [records, typeFilter, appliedSearch, sort])

  if (loading) return <p className="text-zinc-400">불러오는 중...</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">기록 관리</h1>
        <Link href="/records/new" className="bg-zinc-100 text-zinc-900 text-sm px-4 py-2 rounded-lg hover:bg-white transition-colors font-semibold">+ 기록 작성</Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['all', 'concert', 'practice', 'etc'] as const).map(t => (
          <button key={t} onClick={() => handleTypeChange(t)} className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${typeFilter === t ? 'bg-zinc-100 text-zinc-900 border-zinc-100' : 'border-zinc-600 text-zinc-400 hover:border-zinc-400'}`}>
            {t === 'all' ? '전체' : TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="flex flex-1 min-w-0 gap-2">
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') applySearch() }}
            placeholder="제목 / 장소 / 닉네임 검색"
            className="flex-1 min-w-0 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-400"
          />
          <button onClick={applySearch} className="px-4 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 rounded-lg text-zinc-200 transition-colors flex-shrink-0">검색</button>
          {appliedSearch && <button onClick={clearSearch} className="px-3 py-2 text-sm text-zinc-400 hover:text-white transition-colors flex-shrink-0">✕</button>}
        </div>
        <select value={sort} onChange={e => handleSortChange(e.target.value as 'newest' | 'oldest')} className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zinc-400 flex-shrink-0">
          <option value="newest">최신순</option>
          <option value="oldest">오래된순</option>
        </select>
      </div>

      <div className="flex flex-col gap-3">
        {filtered.length === 0 && <div className="text-center text-zinc-500 py-10 bg-zinc-800 border border-zinc-700 rounded-xl">등록된 기록이 없습니다.</div>}
        {filtered.map((record) => (
          <div key={record.id} className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-zinc-600 transition-colors">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {record.record_type && <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${TYPE_STYLE[record.record_type]}`}>{TYPE_LABEL[record.record_type]}</span>}
                <span className="font-semibold text-zinc-100 truncate">{record.title}</span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
                <span>📅 {new Date(record.record_date).toLocaleDateString('ko-KR')}</span>
                <span>📍 {record.location}</span>
                <span>작성: {record.users?.nickname ?? '알 수 없음'}</span>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link href={`/records/${record.id}`} className="text-xs px-3 py-1.5 rounded-lg border border-zinc-600 hover:border-zinc-400 text-zinc-400 hover:text-zinc-200 transition-colors">보기</Link>
              <Link href={`/records/${record.id}/edit`} className="text-xs px-3 py-1.5 rounded-lg border border-zinc-600 hover:border-zinc-400 text-zinc-400 hover:text-zinc-200 transition-colors">수정</Link>
              <button onClick={() => handleDelete(record.id)} className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-red-500/50 text-zinc-500 hover:text-red-400 transition-colors">삭제</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminRecords() {
  return (
    <Suspense fallback={<p className="text-zinc-400">불러오는 중...</p>}>
      <AdminRecordsContent />
    </Suspense>
  )
}
