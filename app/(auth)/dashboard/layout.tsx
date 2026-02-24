'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

interface Props {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: Props) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
    };
    getSession();
  }, []);

  return (
    <div>
      <h1>Dashboard Layout</h1>
      {user && <p>Welcome, {user.email}</p>}
      <div>{children}</div>
    </div>
  );
}