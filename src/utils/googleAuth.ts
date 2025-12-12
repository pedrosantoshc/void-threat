import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../config/supabase';

// Google OAuth configuration
// Using the Supabase OAuth flow instead of direct Google Auth
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; // This will be handled by Supabase

export interface GoogleAuthResult {
  success: boolean;
  user?: any;
  error?: string;
}

export const signInWithGoogle = async (): Promise<GoogleAuthResult> => {
  try {
    WebBrowser.maybeCompleteAuthSession();
    console.log('Starting Google OAuth with Supabase...');
    
    // Force Expo proxy in Expo Go; scheme/path used in dev builds too
    const redirectUri = AuthSession.makeRedirectUri({
      useProxy: true,
      scheme: 'voidthreat',
      path: 'auth-callback',
    });
    console.log('redirectUri', redirectUri);
    
    // Ask Supabase for the auth URL, but prevent auto-redirect
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
        flowType: 'pkce',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    console.log('Supabase OAuth result:', { data, error });

    if (error) {
      console.error('Supabase OAuth Error:', error);
      return { success: false, error: error.message };
    }

    if (!data?.url) {
      return { success: false, error: 'No OAuth URL received from Supabase' };
    }

    // Start the session (use WebBrowser flow for broader SDK compatibility)
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
    console.log('WebBrowser result:', result);

    if (result.type === 'success' || (result as any).type === 'dismiss') {
      // Give Supabase a moment to persist the session
      await new Promise((r) => setTimeout(r, 800));
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        return { success: true, user: session.session.user };
      }
      return { success: false, error: 'Authentication completed but no session found' };
    }

    if (result.type === 'cancel') {
      return { success: false, error: 'Login cancelled' };
    }

    return { success: false, error: 'OAuth flow failed' };
  } catch (error) {
    console.error('Google Auth Error:', error);
    return { success: false, error: 'Authentication failed: ' + String(error) };
  }
};

// Alternative simpler approach for testing
export const testGoogleAuth = async (): Promise<GoogleAuthResult> => {
  try {
    console.log('Testing Supabase Google OAuth...');
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });

    console.log('Supabase OAuth result:', { data, error });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, user: data.user };
  } catch (error) {
    console.error('Test Auth Error:', error);
    return { success: false, error: 'Test authentication failed' };
  }
};