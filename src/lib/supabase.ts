import { createClient } from '@supabase/supabase-js';

// In Lovable, these are automatically injected when connected to Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logging
console.log('Supabase URL available:', !!supabaseUrl);
console.log('Supabase Key available:', !!supabaseAnonKey);

// Create client - Lovable handles the environment variables automatically
export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || ''
);

export default supabase;