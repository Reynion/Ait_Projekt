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
