const authService = require('../services/auth/googleAuthService');

function registerAuthHandlers(ipcMain, mainWindowProvider) {
  authService.onStatusChanged((status) => {
    const mainWindow = typeof mainWindowProvider === 'function' ? mainWindowProvider() : null;
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) return;
    mainWindow.webContents.send('auth:statusChanged', status);
  });

  ipcMain.handle('auth:getStatus', () => authService.getStatus());
  ipcMain.handle('auth:loginGoogle', (_event, input) => authService.loginGoogle(input));
  ipcMain.handle('auth:handleCallback', (_event, url) => authService.handleCallback(String(url || '')));
  ipcMain.handle('auth:logout', () => authService.logout());
  ipcMain.handle('auth:refresh', () => authService.refresh());
  ipcMain.handle('auth:getCurrentUser', () => authService.getCurrentUser());
  ipcMain.handle('auth:getProviderCapabilities', () => authService.getProviderCapabilities());
}

module.exports = { registerAuthHandlers };
