import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  const { tokens, title, body, link } = await req.json() as {
    tokens: string[]
    title: string
    body: string
    link?: string
  }

  if (!tokens || tokens.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  const validTokens = tokens.filter(Boolean)
  if (validTokens.length === 0) return NextResponse.json({ ok: true, sent: 0 })

  try {
    console.log('[push] tokens:', validTokens.length, 'title:', title)
    const response = await admin.messaging().sendEachForMulticast({
      tokens: validTokens,
      webpush: {
        headers: {
          TTL: '86400',
          Urgency: 'high',
        },
        notification: {
          title,
          body,
          icon: '/icon.png',
        },
        data: { link: link ?? '/' },
      },
    })
    console.log('[push] success:', response.successCount, 'fail:', response.failureCount)
    response.responses.forEach((r, i) => {
      if (!r.success) console.log(`[push] token[${i}] error:`, r.error?.code, r.error?.message)
    })
    return NextResponse.json({ ok: true, sent: response.successCount })
  } catch (e) {
    console.error('[push] error:', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
