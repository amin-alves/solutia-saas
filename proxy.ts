import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          res.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Pega a sessão do usuário
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Rotas protegidas: /dashboard e /settings
  const protectedPaths = ['/dashboard', '/settings']

  if (
    protectedPaths.some((path) => req.nextUrl.pathname.startsWith(path)) &&
    !session
  ) {
    // Redireciona para /login se não estiver logado
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

// Matcher define quais URLs vão passar pelo proxy
export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*'],
}