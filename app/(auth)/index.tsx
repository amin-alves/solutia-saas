'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SlugIndex({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const slug = params.slug

  useEffect(() => {
    // Redireciona automaticamente para login
    router.replace(`/${slug}/login`)
  }, [slug, router])

  return <p>Redirecionando para login...</p>
}