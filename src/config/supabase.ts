import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://gruyfdvwsdwbzvmlptgj.supabase.co';
const supabaseAnonKey = 'sb_publishable_zmDbPX82XsztfFldBDoIuQ_hnNyDj3a';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

// Auth helper functions
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'exp://localhost:8081', // Update for production
    },
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};