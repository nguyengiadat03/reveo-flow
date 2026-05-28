import React from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import type { AuthStatus } from '../../types/auth';

interface AuthCallbackStatusProps {
  status: AuthStatus;
}

export const AuthCallbackStatus: React.FC<AuthCallbackStatusProps> = ({ status }) => {
  if (!['authenticating', 'authenticated', 'error'].includes(status.status)) return null;

  const icon = status.status === 'authenticating'
    ? <Loader2 size={16} className="spin" />
    : status.status === 'authenticated'
      ? <CheckCircle2 size={16} />
      : <XCircle size={16} />;

  return (
    <div className="auth-callback-status" data-status={status.status}>
      {icon}
      <span>{status.message}</span>
    </div>
  );
};
