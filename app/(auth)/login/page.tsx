'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage('Login realizado com sucesso!');
        router.push('/(auth)/dashboard'); // página após login
      }
    } catch (err) {
      setMessage('Erro inesperado. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h2 className="text-2xl font-bold">Login</h2>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        className="border p-2 rounded w-80"
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Senha"
        className="border p-2 rounded w-80"
      />
      <button
        onClick={handleLogin}
        disabled={loading}
        className="bg-blue-600 text-white p-2 rounded w-80"
      >
        {loading ? 'Entrando...' : 'Login'}
      </button>
      {message && <p className="text-red-600 mt-2">{message}</p>}
    </div>
  );
}
