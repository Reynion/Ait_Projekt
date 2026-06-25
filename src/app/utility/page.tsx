'use client'

import Navbar from '@/components/Navbar'
import Link from 'next/link'

const TOOLS = [
  {
    href: '/utility/pitch-speed',
    icon: '🎛',
    title: '피치 / 속도 조절',
    desc: '오디오 파일의 피치와 재생 속도를 독립적으로 조절해 합주 연습을 도와줘요.',
  },
  {
    href: '/utility/metronome',
    icon: '🥁',
    title: '메트로놈',
    desc: '다양한 박자와 BPM으로 정확한 템포 연습을 해요. 화면·플래시 깜빡임 지원.',
  },
  {
    href: '/utility/tuner',
    icon: '🎸',
    title: '튜너',
    desc: '마이크로 악기 음정을 실시간 감지해요. 기타·베이스 튜닝 참고 패널 포함.',
  },
  {
    href: '/utility/chord-chart',
    icon: '🎵',
    title: '코드 차트',
    desc: '기타 코드 다이어그램을 확인해요. 루트음과 코드 타입을 선택하면 포지션을 보여줘요.',
  },
  {
    href: '/utility/scale-chart',
    icon: '🎼',
    title: '스케일 차트',
    desc: '기타 프렛보드에서 스케일 위치를 확인해요. Major, Minor, Pentatonic 등 8종 지원.',
  },
  {
    href: '/utility/chord-finder',
    icon: '🎹',
    title: '화음 계산기',
    desc: '음을 선택하면 코드명을 찾아줘요. 전위형(slash chord)도 표시해요.',
  },
]

export default function UtilityPage() {
  return (
    <main className="min-h-screen bg-zinc-950">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">🛠️ 유틸리티</h1>
          <p className="text-zinc-400 text-sm mt-1">합주와 연습에 도움이 되는 도구들이에요.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TOOLS.map(tool => (
            <Link
              key={tool.href}
              href={tool.href}
              className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 flex flex-col gap-3 hover:border-zinc-500 transition-all"
            >
              <span className="text-4xl">{tool.icon}</span>
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-white">{tool.title}</h2>
                <p className="text-sm text-zinc-400 leading-relaxed">{tool.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
