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

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Bloqueia dashboard se não houver sessão
  if (req.nextUrl.pathname.startsWith('/dashboard') && !session) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // 🔹 BUSCAR PROFILE DO USUÁRIO
  if (session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('user_id', session.user.id)
      .single()

    // Armazena company_id em cookie
    res.cookies.set('company_id', profile?.company_id || '')
    res.cookies.set('role', profile?.role || 'user')
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*'],
}