const { app } = require('electron');
const logger = require('../services/logger');
const { runHealthCheck } = require('../services/healthCheckService');

function registerSystemHandlers(ipcMain) {
  ipcMain.handle('system:healthCheck', async (_event, input = {}) => runHealthCheck(input));
  ipcMain.handle('system:getDiagnosticLog', (_event, extra = {}) => logger.getDiagnosticText(extra));
  ipcMain.handle('app:restart', () => {
    app.relaunch();
    app.exit(0);
  });
}

module.exports = { registerSystemHandlers };
