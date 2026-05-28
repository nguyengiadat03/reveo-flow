import React from 'react';
import { ArrowRight, CheckCircle2, KeyRound, RadioTower, ShieldAlert } from 'lucide-react';
import type { ProviderCapability } from '../../types/auth';

interface ProviderCheckStepProps {
  capabilities: ProviderCapability[];
  onUseLocal: () => void;
  onOpenSettings: () => void;
}

function capabilityIcon(status: ProviderCapability['status']) {
  if (status === 'ready') return <CheckCircle2 size={17} />;
  if (status === 'mock-only') return <RadioTower size={17} />;
  if (status === 'missing-api-key') return <KeyRound size={17} />;
  return <ShieldAlert size={17} />;
}

export const ProviderCheckStep: React.FC<ProviderCheckStepProps> = ({ capabilities, onUseLocal, onOpenSettings }) => (
  <section className="onboarding-panel wide">
    <span className="eyebrow">Provider check</span>
    <h2>Chọn nguồn render hợp lệ</h2>
    <p>Video Flow không dùng Google Flow credits qua endpoint không công khai. Hãy dùng provider có API chính thức hoặc local mock để test.</p>

    <div className="capability-grid">
      {capabilities.map((item) => (
        <article className="capability-card" data-status={item.status} key={item.id}>
          <div>{capabilityIcon(item.status)}</div>
          <strong>{item.label}</strong>
          <span>{item.message}</span>
        </article>
      ))}
    </div>

    <div className="onboarding-actions">
      <button className="onboarding-primary" onClick={onUseLocal} type="button">
        Dùng chế độ local
        <ArrowRight size={18} />
      </button>
      <button className="onboarding-secondary" onClick={onOpenSettings} type="button">
        Cấu hình nhà cung cấp
      </button>
    </div>
  </section>
);
