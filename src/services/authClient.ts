import type { AuthStatus } from '../types/auth';

function getSupabasePublicConfig() {
  return {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
    protocol: import.meta.env.VITE_APP_DEEP_LINK_PROTOCOL || 'flowgraph',
  };
}

function authApi() {
  if (!window.desktopAPI?.auth) {
    throw new Error('Đăng nhập chỉ khả dụng trong ứng dụng desktop.');
  }
  return window.desktopAPI.auth;
}

export async function getAuthStatus(): Promise<AuthStatus> {
  return authApi().getStatus();
}

export async function loginGoogle(): Promise<AuthStatus> {
  return authApi().loginGoogle(getSupabasePublicConfig());
}

export async function logout(): Promise<AuthStatus> {
  return authApi().logout();
}

export async function refreshAuth(): Promise<AuthStatus> {
  return authApi().refresh();
}

export async function getCurrentUser(): Promise<AuthStatus> {
  return authApi().getCurrentUser();
}

export async function getProviderCapabilities(): Promise<AuthStatus['capabilities']> {
  return authApi().getProviderCapabilities();
}

export function onAuthStatusChanged(callback: (status: AuthStatus) => void): () => void {
  return authApi().onStatusChanged(callback);
}
