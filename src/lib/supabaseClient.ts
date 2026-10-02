import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/** False when the Supabase env vars are missing — the app then runs in local/demo mode. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// A placeholder client keeps imports working; callers must check isSupabaseConfigured
// first so no requests are sent to the placeholder host.
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
);
