import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  supabase = createClient(url, key);
  return supabase;
}

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function subscribeToChanges(onChange: () => void): (() => void) | null {
  const sb = getSupabase();
  if (!sb) return null;

  const channel = sb
    .channel('drawer-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lists' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'drawers' }, onChange)
    .subscribe();

  return () => {
    sb.removeChannel(channel);
  };
}
