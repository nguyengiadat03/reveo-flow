import type { MediaFilter, SelectedMedia } from '../types';

const acceptByFilter: Record<MediaFilter, string> = {
  image: 'image/*',
  audio: 'audio/*',
  video: 'video/*',
};

export function mediaToDataUrl(media: SelectedMedia): string {
  if (media.base64.startsWith('data:')) return media.base64;
  return `data:${media.mimeType};base64,${media.base64}`;
}

export async function selectMedia(filter: MediaFilter): Promise<SelectedMedia | null> {
  if (window.desktopAPI) {
    return window.desktopAPI.selectMedia(filter);
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = acceptByFilter[filter];
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve({
          name: file.name,
          mediaId: file.name,
          mimeType: file.type || 'application/octet-stream',
          base64,
        });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

export async function saveBase64File(base64: string, mimeType: string, defaultName: string): Promise<void> {
  if (window.desktopAPI) {
    await window.desktopAPI.saveBase64File({ base64, mimeType, defaultName });
    return;
  }

  const a = document.createElement('a');
  a.href = base64.startsWith('data:') ? base64 : `data:${mimeType};base64,${base64}`;
  a.download = defaultName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
