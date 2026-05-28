export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
  configured: boolean;
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
  return {
    url,
    anonKey,
    configured: Boolean(url && anonKey),
  };
}

export function getSupabaseMissingConfigMessage(): string {
  const config = getSupabasePublicConfig();
  if (config.configured) return '';
  return 'Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY. Local mode vẫn hoạt động.';
}
