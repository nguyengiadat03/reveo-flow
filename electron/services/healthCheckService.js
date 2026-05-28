const { app } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const ffmpegPath = require('ffmpeg-static');
const packageJson = require('../../package.json');
const apiKeyStore = require('./apiKeyStore');
const { listProviderDefinitions } = require('./providerRegistry');
const updateService = require('./updateService');
const logger = require('./logger');

function check(id, group, label, status, message, suggestedFix = '') {
  return { id, group, label, status, message, suggestedFix };
}

function withTimeout(promise, ms, timeoutMessage) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
    })
  ]).finally(() => clearTimeout(timer));
}

async function canWriteDirectory(dir) {
  const file = path.join(dir, `video-flow-health-${Date.now()}.tmp`);
  await fs.writeFile(file, 'ok', 'utf8');
  await fs.unlink(file);
}

function runFfmpegVersion() {
  return new Promise((resolve, reject) => {
    execFile(ffmpegPath, ['-version'], { timeout: 5000 }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(String(stdout || '').split('\n')[0]);
    });
  });
}

function validateWorkflow(summary = {}) {
  const nodes = Array.isArray(summary.nodes) ? summary.nodes : [];
  const edges = Array.isArray(summary.edges) ? summary.edges : [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const invalidEdges = edges.filter((edge) => !nodeIds.has(edge.source) || !nodeIds.has(edge.target));
  const types = new Set(nodes.map((node) => node.type));
  const checks = [];

  checks.push(check(
    'workflow-nodes',
    'Workflow',
    'Nodes workflow',
    nodes.length > 0 ? 'pass' : 'fail',
    nodes.length > 0 ? `${nodes.length} node đang có trên canvas.` : 'Workflow chưa có node.',
    'Mở workflow mẫu hoặc thêm node mới.'
  ));
  checks.push(check('workflow-script', 'Workflow', 'Script node', types.has('script') ? 'pass' : 'warning', types.has('script') ? 'Có node kịch bản.' : 'Thiếu node kịch bản.', 'Thêm node Kịch bản.'));
  checks.push(check('workflow-scene', 'Workflow', 'Scene node', types.has('scene') ? 'pass' : 'warning', types.has('scene') ? 'Có node cảnh quay.' : 'Thiếu node cảnh quay.', 'Thêm node Cảnh quay.'));
  checks.push(check('workflow-export', 'Workflow', 'Export node', types.has('export') ? 'pass' : 'warning', types.has('export') ? 'Có node xuất video.' : 'Thiếu node xuất video.', 'Thêm node Xuất bản.'));
  checks.push(check(
    'workflow-edges',
    'Workflow',
    'Liên kết node',
    invalidEdges.length === 0 ? 'pass' : 'fail',
    invalidEdges.length === 0 ? `${edges.length} edge hợp lệ.` : `${invalidEdges.length} edge trỏ tới node không tồn tại.`,
    'Xóa edge lỗi hoặc mở lại workflow hợp lệ.'
  ));
  return checks;
}

async function runHealthCheck(input = {}) {
  const startedAt = Date.now();
  const checks = [];
  logger.info('health', 'Running system health check');

  checks.push(check('runtime-version', 'App Runtime', 'Phiên bản app', 'pass', `Video Flow ${app.getVersion()}`));
  checks.push(check('runtime-electron', 'App Runtime', 'Electron runtime', 'pass', `Electron ${process.versions.electron || 'unknown'}`));
  checks.push(check('runtime-mode', 'App Runtime', 'Packaged/dev mode', app.isPackaged ? 'pass' : 'warning', app.isPackaged ? 'Đang chạy bản packaged.' : 'Đang chạy dev mode.'));
  checks.push(check('runtime-os', 'App Runtime', 'Hệ điều hành', 'pass', `${process.platform} ${process.arch}`));

  const updateStatus = updateService.getUpdateStatus();
  const publishConfig = packageJson.build?.publish?.[0];
  checks.push(check('update-publish', 'Update', 'Kênh cập nhật', publishConfig ? 'pass' : 'fail', publishConfig ? `GitHub Releases: ${publishConfig.owner}/${publishConfig.repo}` : 'Chưa cấu hình publish.', 'Thêm build.publish trong package.json.'));
  checks.push(check('update-status', 'Update', 'Update service', ['error'].includes(updateStatus.status) ? 'warning' : 'pass', updateStatus.message || updateStatus.status));
  checks.push(check('update-portable', 'Update', 'Portable mode', updateStatus.isPortable ? 'warning' : 'pass', updateStatus.isPortable ? 'Portable không phải kênh auto-update chính.' : 'Không phát hiện portable mode.'));

  try {
    await canWriteDirectory(app.getPath('userData'));
    checks.push(check('fs-appdata', 'File System', 'Quyền ghi app data', 'pass', app.getPath('userData')));
  } catch (error) {
    checks.push(check('fs-appdata', 'File System', 'Quyền ghi app data', 'fail', error.message, 'Kiểm tra quyền thư mục AppData hoặc chạy lại app.'));
  }

  try {
    await canWriteDirectory(app.getPath('temp'));
    checks.push(check('fs-temp', 'File System', 'Quyền ghi temp', 'pass', app.getPath('temp')));
  } catch (error) {
    checks.push(check('fs-temp', 'File System', 'Quyền ghi temp', 'fail', error.message, 'Dọn temp hoặc kiểm tra quyền ghi.'));
  }

  if (ffmpegPath) {
    try {
      const version = await withTimeout(runFfmpegVersion(), 6000, 'FFmpeg không phản hồi trong 6 giây.');
      checks.push(check('ffmpeg-version', 'FFmpeg/Local Renderer', 'FFmpeg binary', 'pass', version));
    } catch (error) {
      checks.push(check('ffmpeg-version', 'FFmpeg/Local Renderer', 'FFmpeg binary', 'fail', error.message, 'Cài lại dependency ffmpeg-static hoặc build lại app.'));
    }
  } else {
    checks.push(check('ffmpeg-path', 'FFmpeg/Local Renderer', 'FFmpeg binary', 'fail', 'Không tìm thấy ffmpeg-static.', 'Chạy npm install rồi build lại.'));
  }

  try {
    const definitions = listProviderDefinitions();
    const configs = await apiKeyStore.listPublicConfigs(definitions.map((provider) => provider.id));
    definitions.forEach((provider) => {
      const config = configs[provider.id] || {};
      const status = !provider.requiresApiKey || config.hasApiKey ? 'pass' : 'warning';
      checks.push(check(
        `provider-${provider.id}`,
        'API Providers',
        provider.shortName || provider.name,
        status,
        !provider.requiresApiKey ? provider.statusLabel : config.hasApiKey ? 'Đã cấu hình khóa API.' : 'Chưa cấu hình khóa API.',
        provider.requiresApiKey ? 'Mở Cấu hình API và lưu khóa API.' : ''
      ));
    });
  } catch (error) {
    checks.push(check('provider-list', 'API Providers', 'Danh sách provider', 'fail', error.message, 'Kiểm tra apiKeyStore/providerRegistry.'));
  }

  checks.push(...validateWorkflow(input.workflow));
  checks.push(check('auth-status', 'Auth', 'Trạng thái đăng nhập', 'skipped', 'Health check không yêu cầu đăng nhập để render local.'));
  checks.push(check('render-queue', 'Render Queue', 'Job render', updateStatus.blockedReason ? 'warning' : 'pass', updateStatus.blockedReason || 'Không có job render đang chặn cập nhật.'));
  checks.push(check('logs-errors', 'Logs', 'Lỗi nghiêm trọng gần đây', logger.getLogs().some((entry) => entry.level === 'error') ? 'warning' : 'pass', logger.getLogs().some((entry) => entry.level === 'error') ? 'Có lỗi trong diagnostic log.' : 'Không ghi nhận lỗi nghiêm trọng trong phiên hiện tại.'));

  return {
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    checks
  };
}

module.exports = { runHealthCheck };
