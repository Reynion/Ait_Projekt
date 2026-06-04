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
    const response = await admin.messaging().sendEachForMulticast({
      tokens: validTokens,
      notification: { title, body },
      webpush: {
        notification: {
          title,
          body,
          icon: '/og-image.png',
        },
        fcmOptions: { link: link ?? '/' },
      },
    })

    return NextResponse.json({ ok: true, sent: response.successCount })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
