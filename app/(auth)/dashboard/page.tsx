'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export default function DashboardPage() {
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (data) setProfiles(data);
      else console.error(error);
    };
    fetchProfiles();
  }, []);

  return (
    <div>
      <h2>Dashboard Page</h2>
      <pre>{JSON.stringify(profiles, null, 2)}</pre>
    </div>
  );
}