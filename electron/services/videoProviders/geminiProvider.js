const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

function getApiKey(apiKey) {
  return String(apiKey || process.env.GEMINI_API_KEY || '').trim();
}

function safeApiError(error, fallback = 'Gemini API không phản hồi.') {
  return String(error?.message || error || fallback)
    .replace(/key=[^&\s]+/gi, 'key=[hidden]')
    .replace(/x-goog-api-key:[^&\s]+/gi, 'x-goog-api-key:[hidden]');
}

async function geminiFetch(pathname, apiKey, options = {}) {
  const headers = {
    'x-goog-api-key': apiKey,
    ...(options.headers || {})
  };
  if (options.body) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let message = `Gemini API HTTP ${response.status}.`;
    try {
      const errorBody = await response.json();
      message = errorBody?.error?.message || message;
    } catch {
      // Keep sanitized fallback.
    }
    throw new Error(message);
  }

  return response.json();
}

async function testConnection(apiKey) {
  const key = getApiKey(apiKey);
  if (!key) return { ok: false, message: 'Thiếu Gemini API key.' };

  try {
    await geminiFetch('/models', key, { method: 'GET' });
    return { ok: true, message: 'Gemini API sẵn sàng.' };
  } catch (error) {
    return { ok: false, message: safeApiError(error, 'Không kết nối được Gemini API.') };
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPrompt(request) {
  return [
    request.prompt,
    request.aspectRatio ? `Aspect ratio: ${request.aspectRatio}` : '',
    request.durationSeconds ? `Duration target: ${request.durationSeconds} seconds.` : '',
    'Professional commercial video, coherent subject, clean camera motion, production-ready lighting.'
  ].filter(Boolean).join('\n');
}

async function renderVideo(request) {
  const key = getApiKey(request.apiKey);
  if (!key) throw new Error('Thiếu Gemini API key.');

  const modelName = request.modelName || 'veo-3.1-generate-preview';
  const operation = await geminiFetch(`/models/${encodeURIComponent(modelName)}:predictLongRunning`, key, {
    method: 'POST',
    body: JSON.stringify({
      instances: [{ prompt: buildPrompt(request) }],
      parameters: {
        aspectRatio: request.aspectRatio || '9:16',
        sampleCount: 1
      }
    })
  });

  if (!operation?.name) throw new Error('Gemini API không trả về operation hợp lệ.');

  let status = operation;
  for (let attempt = 0; attempt < 90; attempt += 1) {
    await sleep(10000);
    status = await geminiFetch(`/${operation.name}`, key, { method: 'GET' });
    if (status.done) break;
  }

  if (!status.done) throw new Error('Gemini API vẫn đang xử lý. Vui lòng thử lại sau.');
  if (status.error) throw new Error(status.error.message || 'Gemini API render thất bại.');

  const videoUri = status?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
  if (!videoUri) throw new Error('Gemini API không trả về video.');

  const videoResponse = await fetch(videoUri, { headers: { 'x-goog-api-key': key } });
  if (!videoResponse.ok) throw new Error(`Không tải được video Gemini HTTP ${videoResponse.status}.`);

  const buffer = Buffer.from(await videoResponse.arrayBuffer());
  const outputDir = path.join(os.tmpdir(), 'reveo-flow-render');
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `gemini_scene_${Number(request.sceneIndex || 0) + 1}_${Date.now()}.mp4`);
  await fs.writeFile(outputPath, buffer);

  return {
    providerId: 'gemini-veo',
    mediaId: outputPath,
    filePath: outputPath,
    mimeType: 'video/mp4',
    base64: `data:video/mp4;base64,${buffer.toString('base64')}`,
    status: 'done'
  };
}

module.exports = {
  id: 'gemini-veo',
  testConnection,
  renderVideo,
  getJobStatus: async () => ({ status: 'not-tracked' }),
  downloadResult: async () => null
};
