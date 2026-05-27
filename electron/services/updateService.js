const { app } = require('electron');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;
let blockedReason = '';
let downloadTimer = null;

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
  blockedReason: ''
};

function isDevMode() {
  return !app.isPackaged;
}

function isMockMode() {
  return process.env.ELECTRON_MOCK_UPDATE === 'true';
}

function isPortableRuntime() {
  return Boolean(
    process.env.PORTABLE_EXECUTABLE_FILE ||
    process.env.PORTABLE_EXECUTABLE_DIR ||
    process.env.PORTABLE_EXECUTABLE_APP_FILENAME
  );
}

function toPublicState(patch = {}) {
  return {
    ...state,
    ...patch,
    currentVersion: app.getVersion(),
    isPortable: isPortableRuntime(),
    blockedReason
  };
}

function emitStatus(patch = {}) {
  Object.assign(state, toPublicState(patch));
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:status', state);
  }
  return state;
}

function safeMessage(error) {
  if (!error) return 'Không thể kiểm tra cập nhật.';
  if (typeof error === 'string') return error;
  return String(error.message || 'Không thể kiểm tra cập nhật.');
}

function initAutoUpdater(window) {
  mainWindow = window;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('checking-for-update', () => {
    emitStatus({
      status: 'checking',
      message: 'Đang kiểm tra cập nhật...',
      errorMessage: '',
      canDownload: false,
      canInstall: false
    });
  });

  autoUpdater.on('update-available', (info) => {
    emitStatus({
      status: 'available',
      latestVersion: info?.version || '',
      message: 'Có bản cập nhật mới.',
      canDownload: true,
      canInstall: false
    });
  });

  autoUpdater.on('update-not-available', (info) => {
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
    emitStatus({
      status: 'error',
      errorMessage: safeMessage(error),
      message: 'Kiểm tra cập nhật thất bại.',
      canDownload: false,
      canInstall: false
    });
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
          message: 'Auto-update bị tắt trong dev mode.',
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
      message: 'Auto-update bị tắt trong dev mode. Bật ELECTRON_MOCK_UPDATE=true để test UI.',
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

  return emitStatus();
}

async function checkForUpdates() {
  if (blockedReason) {
    return emitStatus({
      status: 'blocked',
      message: `Đang có tác vụ render, cập nhật sẽ được thực hiện sau khi hoàn tất.`,
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
    return await autoUpdater.checkForUpdates();
  } catch (error) {
    return emitStatus({
      status: 'error',
      errorMessage: safeMessage(error),
      message: 'Kiểm tra cập nhật thất bại.',
      canDownload: false,
      canInstall: false
    });
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
    return getUpdateStatus();
  }

  try {
    return await autoUpdater.downloadUpdate();
  } catch (error) {
    return emitStatus({
      status: 'error',
      errorMessage: safeMessage(error),
      message: 'Tải cập nhật thất bại.',
      canDownload: true,
      canInstall: false
    });
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
  autoUpdater.quitAndInstall(false, true);
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

module.exports = {
  initAutoUpdater,
  checkForUpdates,
  downloadUpdate,
  quitAndInstall,
  getUpdateStatus,
  setUpdateBlocked,
  clearUpdateBlocked
};
