import { NextRequest, NextResponse } from 'next/server'
import { getDemucsServerUrl } from '@/lib/demucs'

const DEMUCS_API_KEY = process.env.DEMUCS_API_KEY

export async function POST(request: NextRequest) {
  const serverUrl = await getDemucsServerUrl()
  if (!serverUrl) {
    return NextResponse.json({ error: '음원 분리 서버가 현재 꺼져 있어요. 로컬 서버가 켜져 있는지 확인해주세요.' }, { status: 503 })
  }

  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
  }

  const forwardForm = new FormData()
  forwardForm.append('file', file, file.name)

  const res = await fetch(`${serverUrl}/separate`, {
    method: 'POST',
    headers: DEMUCS_API_KEY ? { 'X-API-Key': DEMUCS_API_KEY } : undefined,
    body: forwardForm,
  })

  if (!res.ok) {
    const detail = await res.text()
    return NextResponse.json({ error: `음원 분리 서버 오류: ${detail}` }, { status: res.status })
  }

  return NextResponse.json(await res.json())
}
