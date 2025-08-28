import { createClient } from '@supabase/supabase-js';

// These will be automatically injected by Vite when deployed on Lovable
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your project settings.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;