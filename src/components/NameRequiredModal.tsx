'use client'

import { useRouter } from 'next/navigation'

interface Props {
  onClose: () => void
}

export default function NameRequiredModal({ onClose }: Props) {
  const router = useRouter()

  function goProfile() {
    onClose()
    router.push('/profile')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative bg-zinc-800 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm flex flex-col gap-5 shadow-xl">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-bold text-white">프로필 정보를 완성해 주세요</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            이름 정보가 아직 등록되지 않았어요.<br />
            프로필 페이지에서 이름을 입력해 주세요.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-700 border border-zinc-600 rounded-lg py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-400 hover:text-white transition-colors"
          >
            나중에
          </button>
          <button
            onClick={goProfile}
            className="flex-1 bg-zinc-100 text-zinc-900 rounded-lg py-2.5 text-sm font-semibold hover:bg-white transition-colors"
          >
            프로필로 이동
          </button>
        </div>
      </div>
    </div>
  )
}
