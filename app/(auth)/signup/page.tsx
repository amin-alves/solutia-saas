'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const { slug } = useParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setError(error.message)
      return
    }

    // Vincular usuário à empresa pelo slug
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('slug', slug)
      .single()

    if (company && data.user) {
      await supabase
        .from('profiles')
        .update({ company_id: company.id })
        .eq('id', data.user.id)
    }

    router.push(`/${slug}/dashboard`)
  }

  return (
    <div>
      <h1>Login - {slug}</h1>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit">Entrar</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}