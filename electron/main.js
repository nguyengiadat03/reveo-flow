const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { registerApiSettingsHandlers } = require('./ipc/apiSettingsHandlers');
const { registerVideoRenderHandlers } = require('./ipc/videoRenderHandlers');

const isDev = !app.isPackaged;

const mimeTypes = {
  '.apng': 'image/apng',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime'
};

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    title: 'FlowGraph Video Workflow',
    backgroundColor: '#08080b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function getMediaFilters(filter) {
  if (filter === 'audio') {
    return [{ name: 'Audio', extensions: ['mp3', 'wav', 'm4a', 'aac', 'ogg'] }];
  }

  if (filter === 'video') {
    return [{ name: 'Video', extensions: ['mp4', 'webm', 'mov'] }];
  }

  return [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'avif'] }];
}

function registerIpc() {
  registerApiSettingsHandlers(ipcMain);
  registerVideoRenderHandlers(ipcMain);

  ipcMain.handle('workflow:save', async (_event, data, defaultName) => {
    if (typeof data !== 'string') throw new Error('Workflow không hợp lệ.');
    const result = await dialog.showSaveDialog({
      title: 'Lưu workflow',
      defaultPath: defaultName || `workflow_${Date.now()}.json`,
      filters: [{ name: 'Workflow JSON', extensions: ['json'] }]
    });

    if (result.canceled || !result.filePath) return { canceled: true };

    await fs.writeFile(result.filePath, data, 'utf8');
    return { canceled: false, filePath: result.filePath };
  });

  ipcMain.handle('workflow:open', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Mở workflow',
      properties: ['openFile'],
      filters: [{ name: 'Workflow JSON', extensions: ['json'] }]
    });

    if (result.canceled || result.filePaths.length === 0) return { canceled: true };

    const filePath = result.filePaths[0];
    const content = await fs.readFile(filePath, 'utf8');
    return { canceled: false, filePath, content };
  });

  ipcMain.handle('media:select', async (_event, filter) => {
    const mediaFilter = ['image', 'audio', 'video'].includes(filter) ? filter : 'image';
    const result = await dialog.showOpenDialog({
      title: mediaFilter === 'audio' ? 'Chọn audio' : 'Chọn media',
      properties: ['openFile'],
      filters: getMediaFilters(mediaFilter)
    });

    if (result.canceled || result.filePaths.length === 0) return null;

    const filePath = result.filePaths[0];
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    return {
      name: path.basename(filePath),
      mediaId: filePath,
      mimeType: mimeTypes[ext] || 'application/octet-stream',
      base64: buffer.toString('base64')
    };
  });

  ipcMain.handle('media:saveBase64', async (_event, options = {}) => {
    const defaultName = typeof options.defaultName === 'string' ? options.defaultName : `export_${Date.now()}`;
    const result = await dialog.showSaveDialog({
      title: 'Lưu file',
      defaultPath: defaultName,
      filters: [{ name: 'Media', extensions: ['mp4', 'png', 'jpg', 'webm', 'json'] }]
    });

    if (result.canceled || !result.filePath) return { canceled: true };

    const input = String(options.base64 || '');
    const base64 = input.includes(',') ? input.split(',')[1] : input;
    await fs.writeFile(result.filePath, Buffer.from(base64, 'base64'));
    return { canceled: false, filePath: result.filePath };
  });
}
