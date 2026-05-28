const supabaseService = require('../services/supabaseService');

function registerCloudHandlers(ipcMain) {
  ipcMain.handle('cloud:ensureProfile', () => supabaseService.ensureProfile());
  ipcMain.handle('cloud:listWorkflows', () => supabaseService.listWorkflows());
  ipcMain.handle('cloud:saveWorkflow', (_event, input) => supabaseService.saveWorkflow(input));
  ipcMain.handle('cloud:getWorkflow', (_event, workflowId) => supabaseService.getWorkflow(workflowId));
  ipcMain.handle('cloud:createRenderJob', (_event, input) => supabaseService.createRenderJob(input));
}

module.exports = { registerCloudHandlers };
