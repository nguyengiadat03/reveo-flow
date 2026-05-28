export type AuthStatusCode =
  | 'unauthenticated'
  | 'authenticating'
  | 'authenticated'
  | 'provider-checking'
  | 'provider-ready'
  | 'provider-not-supported'
  | 'error';

export type ProviderCapabilityStatus =
  | 'ready'
  | 'missing-api-key'
  | 'login-required'
  | 'credits-required'
  | 'not-officially-supported'
  | 'mock-only';

export interface AuthProfile {
  id?: string;
  email: string;
  name: string;
  picture?: string;
}

export interface ProviderCapability {
  id: string;
  label: string;
  status: ProviderCapabilityStatus;
  message: string;
}

export interface AuthStatus {
  status: AuthStatusCode;
  provider?: string;
  profile?: AuthProfile | null;
  message: string;
  capabilities: ProviderCapability[];
}
