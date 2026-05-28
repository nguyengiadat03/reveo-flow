import React from 'react';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import type { AuthStatus } from '../../types/auth';
import { getSupabaseMissingConfigMessage } from '../../services/supabaseClient';

interface GoogleLoginStepProps {
  status: AuthStatus;
  busy: boolean;
  onBack: () => void;
  onLogin: () => void;
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.96 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.43 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

export const GoogleLoginStep: React.FC<GoogleLoginStepProps> = ({ status, busy, onBack, onLogin }) => {
  const missingConfig = getSupabaseMissingConfigMessage();

  return (
    <section className="onboarding-panel">
      <button className="text-button" onClick={onBack} type="button">
        <ArrowLeft size={16} />
        Quay lại
      </button>
      <span className="eyebrow">Supabase Auth</span>
      <h2>Đăng nhập bằng Google</h2>
      <p>Trình duyệt mặc định sẽ mở trang Google. App chỉ nhận trạng thái đăng nhập, không đọc cookie và không expose token cho UI.</p>

    <div className="permission-list">
      <div><ShieldCheck size={16} /> Không đọc cookie trình duyệt</div>
      <div><ShieldCheck size={16} /> Không dùng endpoint riêng của Flow</div>
      <div><ShieldCheck size={16} /> Không lưu token dạng plain text</div>
    </div>

      <div className="onboarding-note" data-tone="warn">
        Đăng nhập Google không đồng nghĩa với việc sử dụng được credits Google Flow. Để tạo video bằng Google, hãy cấu hình Gemini/Veo API chính thức.
      </div>

      {missingConfig && <div className="onboarding-note" data-tone="warn">{missingConfig}</div>}
      {status.message && <div className="onboarding-note" data-tone={status.status === 'error' ? 'warn' : 'info'}>{status.message}</div>}

      <button className="google-login-button" onClick={onLogin} disabled={busy || Boolean(missingConfig)} type="button">
        {busy || status.status === 'authenticating' ? <Loader2 size={18} className="spin" /> : <GoogleLogo />}
        Đăng nhập bằng Google
      </button>
    </section>
  );
};
