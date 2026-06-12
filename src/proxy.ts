import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function getSectionFromPath(pathname: string): string | null {
  if (pathname.startsWith('/posts')) return 'posts'
  if (pathname.startsWith('/board')) return 'board'
  if (pathname.startsWith('/polls')) return 'polls'
  if (pathname.startsWith('/schedule')) return 'schedule'
  if (pathname.startsWith('/records')) return 'records'
  if (pathname.startsWith('/guestbook')) return 'guestbook'
  return null
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/auth') ||
    request.nextUrl.pathname.startsWith('/signup')

  if (!user && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (user && request.nextUrl.pathname.startsWith('/admin')) {
    const { data: userRow } = await supabase
      .from('users').select('role').eq('id', user.id).single()
    if (userRow?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // 섹션 접근 권한 제어 (모든 로그인 사용자)
  if (user) {
    const section = getSectionFromPath(request.nextUrl.pathname)
    if (section) {
      const role = user.is_anonymous
        ? 'guest'
        : ((await supabase.from('users').select('role').eq('id', user.id).maybeSingle()).data?.role ?? 'member')

      if (role !== 'admin') {
        const { data: perm } = await supabase
          .from('section_permissions')
          .select('can_read')
          .eq('section', section)
          .eq('role', role)
          .maybeSingle()
        if (!perm?.can_read) {
          return NextResponse.redirect(new URL('/', request.url))
        }
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.json|.*\\.js|.*\\.ico).*)'],
}
