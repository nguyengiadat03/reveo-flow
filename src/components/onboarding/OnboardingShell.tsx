import React, { useEffect, useState } from 'react';
import { KeyRound, RadioTower } from 'lucide-react';
import { getAuthStatus, loginGoogle, onAuthStatusChanged } from '../../services/authClient';
import type { AuthStatus } from '../../types/auth';
import { AuthCallbackStatus } from './AuthCallbackStatus';
import { GoogleLoginStep } from './GoogleLoginStep';
import { ProviderCheckStep } from './ProviderCheckStep';
import { WelcomeStep } from './WelcomeStep';

type Step = 'welcome' | 'mode' | 'google' | 'providers';

interface OnboardingShellProps {
  onComplete: () => void;
  onOpenSettings: () => void;
}

const fallbackStatus: AuthStatus = {
  status: 'unauthenticated',
  message: 'Đăng nhập chỉ khả dụng trong ứng dụng desktop.',
  capabilities: [
    { id: 'local-ffmpeg', label: 'Local FFmpeg', status: 'mock-only', message: 'Xuất MP4 offline, không cần credits.' },
    { id: 'gemini-veo', label: 'Gemini / Veo API', status: 'missing-api-key', message: 'Cần Gemini API key.' },
    { id: 'google-flow', label: 'Google Flow credits', status: 'not-officially-supported', message: 'Chưa có API công khai được xác nhận.' },
  ],
};

export const OnboardingShell: React.FC<OnboardingShellProps> = ({ onComplete, onOpenSettings }) => {
  const [step, setStep] = useState<Step>('welcome');
  const [authStatus, setAuthStatus] = useState<AuthStatus>(fallbackStatus);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    getAuthStatus().then((status) => {
      if (mounted) setAuthStatus(status);
    }).catch(() => {
      if (mounted) setAuthStatus(fallbackStatus);
    });

    try {
      return onAuthStatusChanged(setAuthStatus);
    } catch {
      return () => {
        mounted = false;
      };
    }
  }, []);

  useEffect(() => {
    if (authStatus.status === 'authenticated' && step === 'google') {
      setStep('providers');
    }
  }, [authStatus.status, step]);

  const useLocal = () => {
    window.localStorage.setItem('video-flow:onboarding-complete', 'local');
    onComplete();
  };

  const runGoogleLogin = async () => {
    setBusy(true);
    try {
      const next = await loginGoogle();
      setAuthStatus(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="onboarding-shell">
      <div className="onboarding-orbit" />
      <div className="onboarding-frame">
        {step === 'welcome' && <WelcomeStep onNext={() => setStep('mode')} />}

        {step === 'mode' && (
          <section className="onboarding-panel wide">
            <span className="eyebrow">Setup</span>
            <h2>Bạn muốn tạo video bằng cách nào?</h2>
            <div className="mode-grid">
              <button className="mode-card" onClick={() => setStep('google')} type="button">
                <KeyRound size={22} />
                <strong>Đăng nhập Google</strong>
                <span>Kiểm tra điều kiện Google, Gemini/Veo và provider hợp lệ.</span>
              </button>
              <button className="mode-card" onClick={useLocal} type="button">
                <RadioTower size={22} />
                <strong>Dùng Local Mock</strong>
                <span>Không cần key. Xuất MP4 basic bằng FFmpeg để test workflow.</span>
              </button>
            </div>
          </section>
        )}

        {step === 'google' && (
          <GoogleLoginStep
            status={authStatus}
            busy={busy}
            onBack={() => setStep('mode')}
            onLogin={runGoogleLogin}
          />
        )}

        <AuthCallbackStatus status={authStatus} />

        {step === 'providers' && (
          <ProviderCheckStep
            capabilities={authStatus.capabilities || fallbackStatus.capabilities}
            onUseLocal={useLocal}
            onOpenSettings={() => {
              window.localStorage.setItem('video-flow:onboarding-complete', 'settings');
              onOpenSettings();
              onComplete();
            }}
          />
        )}
      </div>
    </div>
  );
};
