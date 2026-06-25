'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const SCALES: Record<string, number[]> = {
  'Major': [0, 2, 4, 5, 7, 9, 11],
  'Minor': [0, 2, 3, 5, 7, 8, 10],
  'Major Pentatonic': [0, 2, 4, 7, 9],
  'Minor Pentatonic': [0, 3, 5, 7, 10],
  'Blues': [0, 3, 5, 6, 7, 10],
  'Dorian': [0, 2, 3, 5, 7, 9, 10],
  'Phrygian': [0, 1, 3, 5, 7, 8, 10],
  'Mixolydian': [0, 2, 4, 5, 7, 9, 10],
}

// 표준 튜닝 E A D G B e (6번줄→1번줄)
const OPEN_MIDI = [40, 45, 50, 55, 59, 64]
const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e']

const N_FRETS = 12
const S_GAP = 24
const F_W = 44
const PAD_L = 28
const PAD_T = 28
const DOT_R = 9

const SVG_W = PAD_L + F_W * N_FRETS + 16
const SVG_H = PAD_T + S_GAP * 5 + 20

// 포지션 마크 (3, 5, 7, 9, 12프렛)
const POSITION_MARKS = [3, 5, 7, 9, 12]

export default function ScaleChartPage() {
  const [selectedKey, setSelectedKey] = useState('C')
  const [selectedScale, setSelectedScale] = useState('Major')

  const rootNum = NOTE_NAMES.indexOf(selectedKey)
  const intervals = SCALES[selectedScale]

  function noteAt(stringIdx: number, fret: number) {
    return (OPEN_MIDI[stringIdx] + fret) % 12
  }

  function inScale(noteNum: number) {
    return intervals.includes((noteNum - rootNum + 12) % 12)
  }

  function isRoot(noteNum: number) {
    return noteNum === rootNum
  }

  const scaleNotes = intervals.map(i => NOTE_NAMES[(rootNum + i) % 12])

  return (
    <main className="min-h-screen bg-zinc-950">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <Link href="/utility" className="text-zinc-400 hover:text-white transition-colors text-sm w-fit">
          ← 유틸리티
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">🎼 스케일 차트</h1>
          <p className="text-zinc-400 text-sm mt-1">기타 프렛보드에서 스케일 위치를 확인해요.</p>
        </div>

        {/* 루트음 */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-zinc-400">루트음</p>
          <div className="flex flex-wrap gap-2">
            {NOTE_NAMES.map(key => (
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

        {/* 스케일 타입 */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-zinc-400">스케일</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(SCALES).map(scale => (
              <button
                key={scale}
                onClick={() => setSelectedScale(scale)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedScale === scale ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {scale}
              </button>
            ))}
          </div>
        </div>

        {/* 구성음 */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-zinc-400">구성음 ({selectedKey} {selectedScale})</p>
          <div className="flex flex-wrap gap-2">
            {scaleNotes.map((note, i) => (
              <span
                key={i}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                  i === 0 ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                {note}
              </span>
            ))}
          </div>
        </div>

        {/* 프렛보드 */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-zinc-400">프렛보드</p>
          <div className="overflow-x-auto -mx-2 px-2">
            <svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`}>
              {/* 프렛 번호 */}
              {Array.from({ length: N_FRETS }).map((_, f) => (
                <text key={f} x={PAD_L + f * F_W + F_W / 2} y={PAD_T - 10} textAnchor="middle" fill={POSITION_MARKS.includes(f + 1) ? '#71717a' : '#3f3f46'} fontSize={10}>
                  {f + 1}
                </text>
              ))}

              {/* 넛 */}
              <rect x={PAD_L - 5} y={PAD_T - 2} width={5} height={S_GAP * 5 + 4} fill="#d4d4d8" rx={1} />

              {/* 프렛 세로선 */}
              {Array.from({ length: N_FRETS + 1 }).map((_, f) => (
                <line key={f} x1={PAD_L + f * F_W} y1={PAD_T} x2={PAD_L + f * F_W} y2={PAD_T + S_GAP * 5} stroke="#3f3f46" strokeWidth={1} />
              ))}

              {/* 줄 가로선 */}
              {Array.from({ length: 6 }).map((_, s) => (
                <line key={s} x1={PAD_L} y1={PAD_T + s * S_GAP} x2={PAD_L + N_FRETS * F_W} y2={PAD_T + s * S_GAP} stroke="#52525b" strokeWidth={s < 3 ? 2 - s * 0.3 : 1.2 - (s - 3) * 0.2} />
              ))}

              {/* 줄 이름 (왼쪽) */}
              {STRING_NAMES.map((name, s) => (
                <text key={s} x={PAD_L - 10} y={PAD_T + s * S_GAP} textAnchor="middle" dominantBaseline="middle" fill="#52525b" fontSize={9}>
                  {name}
                </text>
              ))}

              {/* 오픈 음 */}
              {Array.from({ length: 6 }).map((_, s) => {
                const noteNum = OPEN_MIDI[s] % 12
                if (!inScale(noteNum)) return null
                return (
                  <g key={`o-${s}`}>
                    <circle cx={PAD_L - 20} cy={PAD_T + s * S_GAP} r={DOT_R} fill={isRoot(noteNum) ? '#34d399' : '#2563eb'} />
                    <text x={PAD_L - 20} y={PAD_T + s * S_GAP} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={7} fontWeight="bold">
                      {NOTE_NAMES[noteNum]}
                    </text>
                  </g>
                )
              })}

              {/* 스케일 음 */}
              {Array.from({ length: 6 }).map((_, s) =>
                Array.from({ length: N_FRETS }).map((_, f) => {
                  const noteNum = noteAt(s, f + 1)
                  if (!inScale(noteNum)) return null
                  const cx = PAD_L + f * F_W + F_W / 2
                  const cy = PAD_T + s * S_GAP
                  return (
                    <g key={`${s}-${f}`}>
                      <circle cx={cx} cy={cy} r={DOT_R} fill={isRoot(noteNum) ? '#34d399' : '#2563eb'} />
                      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={7} fontWeight="bold">
                        {NOTE_NAMES[noteNum]}
                      </text>
                    </g>
                  )
                })
              )}
            </svg>
          </div>

          {/* 범례 */}
          <div className="flex gap-4 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>루트음</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-600" />
              <span>스케일 음</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
