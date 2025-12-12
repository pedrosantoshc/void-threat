import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Read from Expo config (populated via app.config.ts and .env)
const extra = (Constants.expoConfig?.extra || {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};
const supabaseUrl = extra.supabaseUrl?.trim();
const supabaseAnonKey = extra.supabaseAnonKey?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase config (supabaseUrl/supabaseAnonKey) — check .env and app.config.ts');
}

// Catch common misconfig early (typos like missing letters in the project ref)
if (!/^https:\/\/.+\.supabase\.co\/?$/.test(supabaseUrl)) {
  throw new Error(`Invalid Supabase URL format: "${supabaseUrl}" (expected https://<project-ref>.supabase.co)`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

// Auth helper functions
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signUpWithEmail = async (email: string, password: string, displayName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });
  return { data, error };
};

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'exp://localhost:8081', // Update for production
    },
  });
  return { data, error };
};

export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'exp://localhost:8081/reset-password',
  });
  return { data, error };
};

export const updateProfile = async (updates: { display_name?: string; avatar_url?: string }) => {
  const { data, error } = await supabase.auth.updateUser({
    data: updates,
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

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
};

// Auth state listener
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};