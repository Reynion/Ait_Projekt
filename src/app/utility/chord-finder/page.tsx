'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

interface ChordPattern {
  suffix: string
  intervals: number[]
}

const CHORD_PATTERNS: ChordPattern[] = [
  { suffix: 'major', intervals: [0, 4, 7] },
  { suffix: 'minor', intervals: [0, 3, 7] },
  { suffix: '7', intervals: [0, 4, 7, 10] },
  { suffix: 'maj7', intervals: [0, 4, 7, 11] },
  { suffix: 'm7', intervals: [0, 3, 7, 10] },
  { suffix: 'dim', intervals: [0, 3, 6] },
  { suffix: 'dim7', intervals: [0, 3, 6, 9] },
  { suffix: 'aug', intervals: [0, 4, 8] },
  { suffix: 'm7b5', intervals: [0, 3, 6, 10] },
  { suffix: 'sus2', intervals: [0, 2, 7] },
  { suffix: 'sus4', intervals: [0, 5, 7] },
  { suffix: 'add9', intervals: [0, 2, 4, 7] },
  { suffix: '9', intervals: [0, 2, 4, 7, 10] },
  { suffix: 'maj9', intervals: [0, 2, 4, 7, 11] },
  { suffix: 'm9', intervals: [0, 2, 3, 7, 10] },
  { suffix: '6', intervals: [0, 4, 7, 9] },
  { suffix: 'm6', intervals: [0, 3, 7, 9] },
]

interface ChordResult {
  display: string
  root: string
  suffix: string
}

function findChords(selected: number[]): ChordResult[] {
  if (selected.length < 2) return []
  const results: ChordResult[] = []
  const sorted = [...selected].sort((a, b) => a - b)

  for (const root of sorted) {
    const relIntervals = sorted.map(n => (n - root + 12) % 12).sort((a, b) => a - b)

    for (const pattern of CHORD_PATTERNS) {
      if (
        relIntervals.length === pattern.intervals.length &&
        pattern.intervals.every((v, i) => v === relIntervals[i])
      ) {
        const rootName = NOTE_NAMES[root]
        const chordName = pattern.suffix === 'major' ? rootName : `${rootName}${pattern.suffix}`
        const bassNote = sorted[0] !== root ? NOTE_NAMES[sorted[0]] : undefined
        results.push({
          display: bassNote ? `${chordName}/${bassNote}` : chordName,
          root: rootName,
          suffix: pattern.suffix,
        })
      }
    }
  }

  return results
}

export default function ChordFinderPage() {
  const [selected, setSelected] = useState<number[]>([])

  function toggleNote(note: number) {
    setSelected(prev =>
      prev.includes(note) ? prev.filter(n => n !== note) : [...prev, note]
    )
  }

  const results = findChords(selected)
  const sorted = [...selected].sort((a, b) => a - b)

  return (
    <main className="min-h-screen bg-zinc-950">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        <Link href="/utility" className="text-zinc-400 hover:text-white transition-colors text-sm w-fit">
          ← 유틸리티
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">🎹 화음 계산기</h1>
          <p className="text-zinc-400 text-sm mt-1">음을 선택하면 코드명을 찾아줘요.</p>
        </div>

        {/* 음 선택 */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-400">음 선택 ({selected.length}개)</p>
            {selected.length > 0 && (
              <button onClick={() => setSelected([])} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                초기화
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {NOTE_NAMES.map((note, i) => (
              <button
                key={i}
                onClick={() => toggleNote(i)}
                className={`w-12 h-10 rounded-lg text-sm font-bold transition-all active:scale-95 ${
                  selected.includes(i)
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {note}
              </button>
            ))}
          </div>

          {/* 선택된 음 표시 */}
          {sorted.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {sorted.map(n => (
                <span key={n} className="px-2.5 py-1 bg-emerald-900/40 border border-emerald-700/60 rounded-lg text-emerald-400 text-xs font-bold">
                  {NOTE_NAMES[n]}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 결과 */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-zinc-400">결과</p>
          {selected.length < 2 ? (
            <p className="text-zinc-600 text-sm">음을 2개 이상 선택해 주세요.</p>
          ) : results.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {results.map((r, i) => (
                <div key={i} className="px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl flex flex-col gap-0.5">
                  <p className="text-white font-black text-xl">{r.display}</p>
                  {r.suffix !== 'major' && (
                    <p className="text-zinc-500 text-xs">{r.root} {r.suffix}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-600 text-sm">일치하는 코드가 없어요. 다른 음 조합을 시도해 보세요.</p>
          )}
        </div>
      </div>
    </main>
  )
}
