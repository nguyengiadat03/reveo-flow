const electron = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ffmpegStatic = require('ffmpeg-static');

function resolveFfmpegPath() {
  if (!ffmpegStatic) throw new Error('Không tìm thấy FFmpeg trong app.');
  return electron.app?.isPackaged ? ffmpegStatic.replace('app.asar', 'app.asar.unpacked') : ffmpegStatic;
}

function getFontPath() {
  const candidates = [
    'C:\\Windows\\Fonts\\arial.ttf',
    'C:\\Windows\\Fonts\\segoeui.ttf',
    'C:\\Windows\\Fonts\\tahoma.ttf'
  ];
  const fontPath = candidates.find((candidate) => fsSync.existsSync(candidate));
  if (!fontPath) throw new Error('Không tìm thấy font Windows để render chữ vào video.');
  return fontPath;
}

function escapeFilterPath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function wrapText(text, maxChars, maxLines) {
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }

    if (lines.length === maxLines) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  return lines.length > 0 ? lines : ['Video workflow'];
}

function drawText({ fontPath, text, textFileFactory, size, color = 'white', x = '(w-text_w)/2', y }) {
  const textOption = textFileFactory
    ? `textfile='${escapeFilterPath(textFileFactory(text))}'`
    : `text='${String(text || '').replace(/'/g, "\\'")}'`;

  return [
    `drawtext=fontfile='${escapeFilterPath(fontPath)}'`,
    textOption,
    `fontcolor=${color}`,
    `fontsize=${size}`,
    `x=${x}`,
    `y=${y}`
  ].join(':');
}

function buildVideoFilter(options) {
  const { width, height, fontPath, sceneIndex, prompt, shot, characterName, characterDescription, voiceName, modelName, textFileFactory } = options;
  const title = shot?.title || `Cảnh ${sceneIndex + 1}`;
  const action = shot?.action || shot?.description || prompt || 'Workflow đã sẵn sàng để render video.';
  const topicLines = wrapText(prompt, width > height ? 54 : 31, 3);
  const actionLines = wrapText(action, width > height ? 64 : 34, 5);
  const character = [characterName, characterDescription].filter(Boolean).join(' - ') || 'Chưa chọn nhân vật';
  const voice = voiceName || 'Chưa chọn giọng nói';
  const panelX = Math.round(width * 0.07);
  const panelW = Math.round(width * 0.86);
  const filters = [
    'drawbox=x=0:y=0:w=iw:h=ih:color=0x08080b@1:t=fill',
    `drawbox=x=${panelX}:y=${Math.round(height * 0.07)}:w=${panelW}:h=${Math.round(height * 0.12)}:color=0x111827@0.92:t=fill`,
    `drawbox=x=${panelX}:y=${Math.round(height * 0.23)}:w=${panelW}:h=${Math.round(height * 0.35)}:color=0x18181b@0.9:t=fill`,
    `drawbox=x=${panelX}:y=${Math.round(height * 0.66)}:w=${panelW}:h=${Math.round(height * 0.17)}:color=0x0f172a@0.9:t=fill`,
    `drawbox=x=${panelX}:y=${Math.round(height * 0.07)}:w=${Math.round(width * 0.015)}:h=${Math.round(height * 0.76)}:color=0x22d3ee@0.9:t=fill`,
    drawText({ fontPath, textFileFactory, text: 'FLOWGRAPH VIDEO WORKFLOW', size: Math.round(width * 0.036), color: '0x93c5fd', y: Math.round(height * 0.095) }),
    drawText({ fontPath, textFileFactory, text: title.toUpperCase(), size: Math.round(width * 0.052), color: 'white', y: Math.round(height * 0.155) })
  ];

  topicLines.forEach((line, index) => {
    filters.push(drawText({
      fontPath,
      textFileFactory,
      text: line,
      size: Math.round(width * 0.047),
      color: index === 0 ? '0xf8fafc' : '0xdbeafe',
      y: Math.round(height * 0.285) + index * Math.round(width * 0.058)
    }));
  });

  actionLines.forEach((line, index) => {
    filters.push(drawText({
      fontPath,
      textFileFactory,
      text: line,
      size: Math.round(width * 0.035),
      color: '0xe5e7eb',
      y: Math.round(height * 0.44) + index * Math.round(width * 0.048)
    }));
  });

  filters.push(
    drawText({ fontPath, textFileFactory, text: `Nhân vật: ${character}`, size: Math.round(width * 0.027), color: '0xfbbf24', y: Math.round(height * 0.705) }),
    drawText({ fontPath, textFileFactory, text: `Giọng nói: ${voice}`, size: Math.round(width * 0.027), color: '0xf9a8d4', y: Math.round(height * 0.75) }),
    drawText({ fontPath, textFileFactory, text: `${modelName || 'Local FFmpeg'} | Mock renderer`, size: Math.round(width * 0.025), color: '0x94a3b8', y: Math.round(height * 0.9) })
  );

  return filters.join(',');
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(resolveFfmpegPath(), args, { windowsHide: true });
    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`FFmpeg render lỗi (${code}): ${stderr.slice(-5000)}`));
    });
  });
}

async function testConnection() {
  const ffmpegPath = resolveFfmpegPath();
  if (!fsSync.existsSync(ffmpegPath)) {
    return { ok: false, message: 'Không tìm thấy FFmpeg binary trong app.' };
  }

  return { ok: true, message: 'Local FFmpeg sẵn sàng render MP4.' };
}

async function renderVideo(request) {
  const aspectRatio = request.aspectRatio === '16:9' ? '16:9' : '9:16';
  const width = aspectRatio === '16:9' ? 1280 : 720;
  const height = aspectRatio === '16:9' ? 720 : 1280;
  const duration = clampNumber(request.durationSeconds, 3, 30, 8);
  const sceneIndex = clampNumber(request.sceneIndex, 0, 999, 0);
  const outputDir = path.join(os.tmpdir(), 'reveo-flow-render');
  const outputPath = path.join(outputDir, `scene_${sceneIndex + 1}_${Date.now()}.mp4`);

  await fs.mkdir(outputDir, { recursive: true });
  const textDir = path.join(outputDir, `text_${Date.now()}`);
  fsSync.mkdirSync(textDir, { recursive: true });
  let textFileIndex = 0;
  const textFileFactory = (text) => {
    textFileIndex += 1;
    const textPath = path.join(textDir, `${textFileIndex}.txt`);
    fsSync.writeFileSync(textPath, String(text || ''), 'utf8');
    return textPath;
  };

  const filter = buildVideoFilter({
    width,
    height,
    fontPath: getFontPath(),
    sceneIndex,
    prompt: request.prompt || request.topic || 'Video workflow',
    shot: request.shot || null,
    characterName: request.character?.name,
    characterDescription: request.character?.description,
    voiceName: request.voice?.name,
    modelName: request.modelName,
    textFileFactory
  });

  await runFfmpeg([
    '-y',
    '-f', 'lavfi',
    '-i', `color=c=0x08080b:s=${width}x${height}:r=30`,
    '-f', 'lavfi',
    '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-t', String(duration),
    '-vf', filter,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-shortest',
    '-movflags', '+faststart',
    outputPath
  ]);

  const buffer = await fs.readFile(outputPath);
  return {
    providerId: 'local-ffmpeg',
    mediaId: outputPath,
    filePath: outputPath,
    mimeType: 'video/mp4',
    base64: `data:video/mp4;base64,${buffer.toString('base64')}`,
    status: 'done'
  };
}

module.exports = {
  id: 'local-ffmpeg',
  testConnection,
  renderVideo,
  getJobStatus: async () => ({ status: 'done' }),
  downloadResult: async () => null
};
