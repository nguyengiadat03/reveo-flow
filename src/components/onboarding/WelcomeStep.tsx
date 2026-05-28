import React from 'react';
import { ArrowRight, Clapperboard } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => (
  <section className="onboarding-panel intro">
    <div className="brand-mark">
      <Clapperboard size={26} />
    </div>
    <span className="eyebrow">Video Flow Studio</span>
    <h1>AI Video Workflow Studio</h1>
    <p>Thiết kế kịch bản, gom reference, render từng cảnh và xuất MP4 trong một canvas production-ready.</p>
    <button className="onboarding-primary" onClick={onNext} type="button">
      Bắt đầu
      <ArrowRight size={18} />
    </button>
  </section>
);
