// app/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone()
  const { pathname } = req.nextUrl

  // Permitir rotas públicas
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('/login') ||
    pathname.includes('/favicon.ico')
  ) return NextResponse.next()

  // Capturar slug da URL
  const slugMatch = pathname.match(/^\/([^\/]+)\/.+/)
  if (!slugMatch) return NextResponse.next()
  const slug = slugMatch[1]

  // Pegar token HttpOnly do Supabase
  const token = req.cookies.get('sb:token')?.value
  if (!token) {
    url.pathname = `/${slug}/login`
    return NextResponse.redirect(url)
  }

  // Validar usuário
  const { data: { user } = {}, error: userError } = await supabaseServer.auth.getUser(token)
  if (userError || !user) {
    url.pathname = `/${slug}/login`
    return NextResponse.redirect(url)
  }

  // Pegar profile da empresa
  const { data: profile } = await supabaseServer
    .from('profiles')
    .select('company_id, company_slug')
    .eq('id', user.id)
    .single()

  if (!profile) {
    url.pathname = `/${slug}/login`
    return NextResponse.redirect(url)
  }

  // Bloquear acesso se slug não bater com empresa
  if (slug !== profile.company_slug) {
    url.pathname = `/${slug}/login`
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|favicon.ico).*)'],
}