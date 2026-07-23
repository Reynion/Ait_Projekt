import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { data: jobs, error } = await supabase
    .from('stem_jobs')
    .select('job_id, filename, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    return NextResponse.json({ error: '기록 조회에 실패했어요.' }, { status: 500 })
  }

  const admin = createAdminClient()

  const results = await Promise.all((jobs ?? []).map(async job => {
    const { data: files } = await admin.storage.from('separated-audio').list(job.job_id)
    if (!files || files.length === 0) return null

    const urls: Record<string, string> = {}
    for (const f of files) {
      const key = f.name.replace(/\.[^.]+$/, '')
      const { data: pub } = admin.storage.from('separated-audio').getPublicUrl(`${job.job_id}/${f.name}`)
      urls[key] = pub.publicUrl
    }

    return { job_id: job.job_id, filename: job.filename, created_at: job.created_at, urls }
  }))

  return NextResponse.json({ jobs: results.filter((j): j is NonNullable<typeof j> => j !== null) })
}
