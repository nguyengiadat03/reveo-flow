const updateService = require('../services/updateService');

function registerUpdateHandlers(ipcMain) {
  ipcMain.handle('update:check', () => updateService.checkForUpdates());
  ipcMain.handle('update:download', () => updateService.downloadUpdate());
  ipcMain.handle('update:install', () => updateService.quitAndInstall());
  ipcMain.handle('update:getStatus', () => updateService.getUpdateStatus());
  ipcMain.handle('update:setBlocked', (_event, reason) => updateService.setUpdateBlocked(reason));
  ipcMain.handle('update:clearBlocked', () => updateService.clearUpdateBlocked());
}

module.exports = { registerUpdateHandlers };
