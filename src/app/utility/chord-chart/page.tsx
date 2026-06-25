'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const guitarData = require('@tombatossals/chords-db/lib/guitar.json') as any

interface ChordPosition {
  frets: number[]
  fingers: number[]
  baseFret: number
  barres: number[]
  capo?: boolean
}

const CHORD_TYPES = [
  { label: 'major', value: 'major' },
  { label: 'minor', value: 'minor' },
  { label: '7', value: '7' },
  { label: 'maj7', value: 'maj7' },
  { label: 'm7', value: 'm7' },
  { label: 'sus2', value: 'sus2' },
  { label: 'sus4', value: 'sus4' },
  { label: 'dim', value: 'dim' },
  { label: 'aug', value: 'aug' },
  { label: 'add9', value: 'add9' },
  { label: '9', value: '9' },
  { label: '6', value: '6' },
]

const KEYS: string[] = guitarData.keys

function toChordKey(key: string) {
  return key.replace('#', 'sharp')
}

const N_STRINGS = 6
const N_FRETS = 5
const S_GAP = 22
const F_GAP = 26
const PAD_L = 22
const PAD_T = 38
const R = 8

const W = PAD_L * 2 + S_GAP * (N_STRINGS - 1)
const H = PAD_T + F_GAP * N_FRETS + 16

function fretY(fret: number) {
  return PAD_T + (fret - 0.5) * F_GAP
}

function stringX(i: number) {
  return PAD_L + i * S_GAP
}

function ChordDiagram({ position }: { position: ChordPosition }) {
  const { frets, baseFret, barres } = position

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* 넛 or 시작 프렛 번호 */}
      {baseFret === 1 ? (
        <rect x={PAD_L} y={PAD_T - 4} width={S_GAP * (N_STRINGS - 1)} height={4} fill="#e4e4e7" rx={1} />
      ) : (
        <text x={PAD_L - 6} y={fretY(1)} textAnchor="end" dominantBaseline="middle" fill="#71717a" fontSize={11}>
          {baseFret}
        </text>
      )}

      {/* 프렛 가로선 */}
      {Array.from({ length: N_FRETS + 1 }).map((_, i) => (
        <line key={i} x1={PAD_L} y1={PAD_T + i * F_GAP} x2={PAD_L + S_GAP * (N_STRINGS - 1)} y2={PAD_T + i * F_GAP} stroke="#3f3f46" strokeWidth={1} />
      ))}

      {/* 줄 세로선 */}
      {Array.from({ length: N_STRINGS }).map((_, i) => (
        <line key={i} x1={stringX(i)} y1={PAD_T} x2={stringX(i)} y2={PAD_T + N_FRETS * F_GAP} stroke="#3f3f46" strokeWidth={1} />
      ))}

      {/* 바레코드 */}
      {barres.map(barre => {
        let minS = N_STRINGS - 1, maxS = 0
        frets.forEach((f, i) => {
          if (f === barre) { minS = Math.min(minS, i); maxS = Math.max(maxS, i) }
        })
        return (
          <rect
            key={barre}
            x={stringX(minS) - R}
            y={fretY(barre) - R}
            width={stringX(maxS) - stringX(minS) + R * 2}
            height={R * 2}
            rx={R}
            fill="#34d399"
          />
        )
      })}

      {/* 개별 손가락 위치 */}
      {frets.map((fret, i) => {
        if (fret <= 0) return null
        if (barres.includes(fret)) return null
        return <circle key={i} cx={stringX(i)} cy={fretY(fret)} r={R} fill="#34d399" />
      })}

      {/* 상단 오픈/뮤트 */}
      {frets.map((fret, i) => {
        const cx = stringX(i)
        const cy = PAD_T - 16
        if (fret === 0) return <circle key={i} cx={cx} cy={cy} r={6} fill="none" stroke="#71717a" strokeWidth={1.5} />
        if (fret === -1) return (
          <g key={i}>
            <line x1={cx - 5} y1={cy - 5} x2={cx + 5} y2={cy + 5} stroke="#71717a" strokeWidth={1.5} />
            <line x1={cx + 5} y1={cy - 5} x2={cx - 5} y2={cy + 5} stroke="#71717a" strokeWidth={1.5} />
          </g>
        )
        return null
      })}
    </svg>
  )
}

export default function ChordChartPage() {
  const [selectedKey, setSelectedKey] = useState('C')
  const [selectedSuffix, setSelectedSuffix] = useState('major')

  const allChords = (guitarData.chords[toChordKey(selectedKey)] as { key: string; suffix: string; positions: ChordPosition[] }[]) || []
  const currentChord = allChords.find(c => c.suffix === selectedSuffix)
  const positions = currentChord?.positions || []

  const displayName = selectedSuffix === 'major' ? selectedKey : `${selectedKey}${selectedSuffix}`

  return (
    <main className="min-h-screen bg-zinc-950">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <Link href="/utility" className="text-zinc-400 hover:text-white transition-colors text-sm w-fit">
          ← 유틸리티
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">🎸 코드 차트</h1>
          <p className="text-zinc-400 text-sm mt-1">기타 코드 다이어그램을 확인해요.</p>
        </div>

        {/* 루트음 */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-zinc-400">루트음</p>
          <div className="flex flex-wrap gap-2">
            {KEYS.map(key => (
              <button
                key={key}
                onClick={() => setSelectedKey(key)}
                className={`w-11 h-9 rounded-lg text-sm font-bold transition-colors ${
                  selectedKey === key ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {/* 코드 타입 */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-zinc-400">코드 타입</p>
          <div className="flex flex-wrap gap-2">
            {CHORD_TYPES.map(type => {
              const available = allChords.some(c => c.suffix === type.value)
              return (
                <button
                  key={type.value}
                  onClick={() => { if (available) setSelectedSuffix(type.value) }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedSuffix === type.value
                      ? 'bg-emerald-600 text-white'
                      : available
                        ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        : 'bg-zinc-900 text-zinc-700 cursor-not-allowed'
                  }`}
                >
                  {type.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* 다이어그램 */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-baseline gap-3">
            <h2 className="text-3xl font-black text-white">{displayName}</h2>
            <span className="text-zinc-500 text-sm">{positions.length}개 포지션</span>
          </div>
          {positions.length > 0 ? (
            <div className="overflow-x-auto -mx-2 px-2">
              <div className="flex gap-4 pb-2">
                {positions.map((pos, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 shrink-0">
                    <ChordDiagram position={pos} />
                    <span className="text-xs text-zinc-600">{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-zinc-600 text-sm">해당 코드 데이터가 없어요.</p>
          )}
        </div>
      </div>
    </main>
  )
}
