const { app } = require('electron');
const { autoUpdater } = require('electron-updater');
const packageJson = require('../../package.json');
const logger = require('./logger');

let mainWindow = null;
let blockedReason = '';
let downloadTimer = null;
let listenersRegistered = false;

const state = {
  status: 'idle',
  currentVersion: app.getVersion(),
  latestVersion: '',
  percent: 0,
  message: 'Sẵn sàng kiểm tra cập nhật.',
  errorMessage: '',
  isPortable: false,
  canInstall: false,
  canDownload: false,
  blockedReason: '',
  channel: 'GitHub Releases'
};

function safeSendToRenderer(window, channel, payload) {
  try {
    if (!window || window.isDestroyed() || window.webContents.isDestroyed()) return false;
    window.webContents.send(channel, payload);
    return true;
  } catch (error) {
    logger.warn('update', 'Không thể gửi trạng thái update tới renderer.', error);
    return false;
  }
}

function isDevMode() {
  return !app.isPackaged;
}

function isMockMode() {
  return process.env.ELECTRON_MOCK_UPDATE === 'true' || process.env.VITE_MOCK_UPDATE === 'true';
}

function isPortableRuntime() {
  return Boolean(
    process.env.PORTABLE_EXECUTABLE_FILE ||
    process.env.PORTABLE_EXECUTABLE_DIR ||
    process.env.PORTABLE_EXECUTABLE_APP_FILENAME
  );
}

function getPublishConfig() {
  const publish = packageJson.build?.publish;
  return Array.isArray(publish) ? publish[0] : publish || null;
}

function getChannel() {
  if (isMockMode()) return 'Dev Mock';
  const publish = getPublishConfig();
  if (!publish) return 'Chưa cấu hình';
  if (publish.provider === 'github') return `GitHub Releases (${publish.owner}/${publish.repo})`;
  if (publish.provider === 'generic') return 'Generic Server';
  return String(publish.provider || 'Unknown');
}

function toPublicState(patch = {}) {
  return {
    ...state,
    ...patch,
    currentVersion: app.getVersion(),
    isPortable: isPortableRuntime(),
    blockedReason,
    channel: getChannel()
  };
}

function emitStatus(patch = {}) {
  Object.assign(state, toPublicState(patch));
  safeSendToRenderer(mainWindow, 'update:status', state);
  return state;
}

function safeMessage(error) {
  if (!error) return 'Không thể kiểm tra cập nhật.';
  if (typeof error === 'string') return logger.redact(error);
  const message = logger.redact(String(error.message || 'Không thể kiểm tra cập nhật.'));

  if (/ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|network/i.test(message)) {
    return 'Không có kết nối mạng hoặc máy chủ cập nhật không phản hồi.';
  }

  if (/publish|provider|latest\.yml|404|Cannot find|No published versions/i.test(message)) {
    return 'Chưa có GitHub Release hợp lệ hoặc thiếu latest.yml.';
  }

  if (/private|401|403|authentication|authorization/i.test(message)) {
    return 'Không thể đọc release. Nếu repo private, app người dùng sẽ cần kênh phát hành public hoặc generic server.';
  }

  return message;
}

function handleUpdateError(error, message = 'Kiểm tra cập nhật thất bại.') {
  const errorMessage = safeMessage(error);
  logger.warn('update', message, errorMessage);
  return emitStatus({
    status: 'error',
    errorMessage,
    message,
    canDownload: false,
    canInstall: false
  });
}

function initAutoUpdater(window) {
  mainWindow = window;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  if (listenersRegistered) {
    emitStatus();
    return;
  }
  listenersRegistered = true;

  autoUpdater.on('checking-for-update', () => {
    logger.info('update', 'Checking for update.');
    emitStatus({
      status: 'checking',
      message: 'Đang kiểm tra cập nhật...',
      errorMessage: '',
      canDownload: false,
      canInstall: false
    });
  });

  autoUpdater.on('update-available', (info) => {
    logger.info('update', 'Update available.', { version: info?.version });
    emitStatus({
      status: 'available',
      latestVersion: info?.version || '',
      message: 'Có bản cập nhật mới.',
      canDownload: true,
      canInstall: false
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    logger.info('update', 'No update available.', { version: info?.version });
    emitStatus({
      status: 'not-available',
      latestVersion: info?.version || app.getVersion(),
      percent: 0,
      message: 'Bạn đang dùng phiên bản mới nhất.',
      canDownload: false,
      canInstall: false
    });
  });

  autoUpdater.on('error', (error) => {
    handleUpdateError(error);
  });

  autoUpdater.on('download-progress', (progress) => {
    emitStatus({
      status: 'downloading',
      percent: Math.round(progress?.percent || 0),
      message: 'Đang tải bản cập nhật...',
      canDownload: false,
      canInstall: false
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    logger.info('update', 'Update downloaded.', { version: info?.version });
    emitStatus({
      status: 'downloaded',
      latestVersion: info?.version || state.latestVersion,
      percent: 100,
      message: 'Cập nhật đã sẵn sàng.',
      canDownload: false,
      canInstall: true
    });
  });

  emitStatus(
    isDevMode() && !isMockMode()
      ? {
          status: 'dev-disabled',
          message: 'Auto-update tắt trong dev mode.',
          canDownload: false,
          canInstall: false
        }
      : {}
  );
}

function getUpdateStatus() {
  if (isDevMode() && !isMockMode()) {
    return emitStatus({
      status: 'dev-disabled',
      message: 'Auto-update tắt trong dev mode. Bật ELECTRON_MOCK_UPDATE=true để test UI.',
      canDownload: false,
      canInstall: false
    });
  }

  if (isPortableRuntime()) {
    return emitStatus({
      status: 'unsupported-portable',
      message: 'Bản portable không hỗ trợ cập nhật tự động. Vui lòng tải bản installer mới.',
      canDownload: false,
      canInstall: false
    });
  }

  if (!getPublishConfig() && !isMockMode()) {
    return emitStatus({
      status: 'error',
      message: 'Chưa cấu hình kênh cập nhật.',
      errorMessage: 'Thiếu build.publish trong package.json.',
      canDownload: false,
      canInstall: false
    });
  }

  return emitStatus();
}

async function checkForUpdates() {
  if (blockedReason) {
    return emitStatus({
      status: 'blocked',
      message: 'Đang có tác vụ render, cập nhật sẽ được thực hiện sau khi hoàn tất.',
      canDownload: false,
      canInstall: false
    });
  }

  if (isDevMode() && !isMockMode()) return getUpdateStatus();
  if (isPortableRuntime()) return getUpdateStatus();

  if (isMockMode()) {
    return emitStatus({
      status: 'available',
      latestVersion: '1.0.1',
      message: 'Có bản cập nhật mới (mock).',
      canDownload: true,
      canInstall: false
    });
  }

  try {
    await autoUpdater.checkForUpdates();
    return state;
  } catch (error) {
    return handleUpdateError(error);
  }
}

async function downloadUpdate() {
  if (blockedReason) {
    return emitStatus({
      status: 'blocked',
      message: 'Đang có tác vụ render, cập nhật sẽ được thực hiện sau khi hoàn tất.',
      canDownload: false,
      canInstall: false
    });
  }

  if (isDevMode() && !isMockMode()) return getUpdateStatus();
  if (isPortableRuntime()) return getUpdateStatus();

  if (isMockMode()) {
    if (downloadTimer) clearInterval(downloadTimer);
    let percent = 0;
    emitStatus({ status: 'downloading', percent, message: 'Đang tải bản cập nhật (mock)...', canDownload: false });
    downloadTimer = setInterval(() => {
      percent += 18;
      if (percent >= 100) {
        clearInterval(downloadTimer);
        downloadTimer = null;
        emitStatus({
          status: 'downloaded',
          latestVersion: '1.0.1',
          percent: 100,
          message: 'Cập nhật đã sẵn sàng (mock).',
          canInstall: true
        });
        return;
      }
      emitStatus({ status: 'downloading', percent, message: 'Đang tải bản cập nhật (mock)...' });
    }, 350);
    return state;
  }

  try {
    await autoUpdater.downloadUpdate();
    return state;
  } catch (error) {
    return handleUpdateError(error, 'Tải cập nhật thất bại.');
  }
}

function quitAndInstall() {
  if (blockedReason) {
    return emitStatus({
      status: 'blocked',
      message: 'Đang có tác vụ render, không thể cài cập nhật ngay.',
      canInstall: state.status === 'downloaded'
    });
  }

  if (isMockMode()) {
    return emitStatus({
      status: 'downloaded',
      message: 'Mock update đã sẵn sàng. Bản dev không restart thật.',
      canInstall: true
    });
  }

  if (state.status !== 'downloaded') return getUpdateStatus();
  try {
    autoUpdater.quitAndInstall(false, true);
  } catch (error) {
    return handleUpdateError(error, 'Không thể cài bản cập nhật.');
  }
  return state;
}

function setUpdateBlocked(reason) {
  blockedReason = String(reason || 'Đang có tác vụ nền');
  return emitStatus({
    status: 'blocked',
    message: 'Đang có tác vụ render, cập nhật sẽ được thực hiện sau khi hoàn tất.',
    canDownload: false,
    canInstall: state.status === 'downloaded'
  });
}

function clearUpdateBlocked() {
  blockedReason = '';
  return emitStatus({
    status: state.canInstall ? 'downloaded' : 'idle',
    message: state.canInstall ? 'Cập nhật đã sẵn sàng.' : 'Sẵn sàng kiểm tra cập nhật.'
  });
}

function getUpdateDiagnostics() {
  const publish = getPublishConfig();
  return {
    appId: packageJson.build?.appId || '',
    productName: packageJson.build?.productName || app.getName(),
    currentVersion: app.getVersion(),
    packaged: app.isPackaged,
    mockMode: isMockMode(),
    portable: isPortableRuntime(),
    channel: getChannel(),
    publishConfigured: Boolean(publish),
    publishProvider: publish?.provider || '',
    publishOwner: publish?.owner || '',
    publishRepo: publish?.repo || '',
    status: { ...state }
  };
}

module.exports = {
  initAutoUpdater,
  checkForUpdates,
  downloadUpdate,
  quitAndInstall,
  getUpdateStatus,
  getUpdateDiagnostics,
  setUpdateBlocked,
  clearUpdateBlocked,
  safeSendToRenderer
};
