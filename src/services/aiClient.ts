import type { ScriptData, ScriptShot } from '../types';
import type { RenderSceneResult, WorkflowRenderRequest } from './providerTypes';
import { renderSceneWithProvider } from './videoProviderClient';

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function svgToDataUrl(svg: string): string {
  const encoded = window.btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
}

export async function generateScriptShots(data: Pick<ScriptData, 'topic' | 'style' | 'duration' | 'shotCount'>): Promise<ScriptShot[]> {
  await delay(450);

  const toneByStyle = {
    drama: 'cao trào cảm xúc',
    review: 'rõ lợi ích sản phẩm',
    cinematic: 'điện ảnh, giàu hình ảnh',
    comedy: 'nhẹ nhàng, có nhịp hài',
  } as const;

  return Array.from({ length: Math.max(1, data.shotCount) }, (_, index) => {
    const scene = index + 1;
    return {
      id: `shot-${Date.now()}-${scene}`,
      title: `Cảnh ${scene}`,
      description: `${data.topic || 'Chủ đề video'} - nhịp ${toneByStyle[data.style]}.`,
      action: `Dựng cảnh ${scene} trong khoảng ${Math.max(2, Math.round(data.duration / Math.max(1, data.shotCount)))} giây, có mở đầu rõ và chuyển cảnh gọn.`,
    };
  });
}

export async function generateCharacterImage(name: string, description: string): Promise<{ mediaId: string; base64: string }> {
  await delay(500);

  const displayName = name.trim() || 'Nhân vật';
  const displayDesc = description.trim() || 'Chân dung nhân vật';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="768" height="768" viewBox="0 0 768 768">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#111827"/>
          <stop offset="55%" stop-color="#27272a"/>
          <stop offset="100%" stop-color="#7c2d12"/>
        </linearGradient>
      </defs>
      <rect width="768" height="768" fill="url(#bg)"/>
      <circle cx="384" cy="294" r="118" fill="#fb923c"/>
      <path d="M202 664c28-130 112-196 182-196s154 66 182 196" fill="#f97316"/>
      <circle cx="340" cy="282" r="16" fill="#111827"/>
      <circle cx="428" cy="282" r="16" fill="#111827"/>
      <path d="M333 340c36 30 68 30 102 0" stroke="#111827" stroke-width="18" stroke-linecap="round" fill="none"/>
      <text x="384" y="96" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif" font-size="44" font-weight="700">${displayName}</text>
      <text x="384" y="718" text-anchor="middle" fill="#fde68a" font-family="Arial, sans-serif" font-size="24">${displayDesc.slice(0, 48)}</text>
    </svg>
  `;

  return {
    mediaId: `mock-character-${Date.now()}`,
    base64: svgToDataUrl(svg),
  };
}

export async function renderSceneVideo(options: WorkflowRenderRequest): Promise<RenderSceneResult> {
  return renderSceneWithProvider(options);
}
