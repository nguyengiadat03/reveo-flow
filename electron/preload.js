const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  platform: process.platform,
  saveWorkflow: (data, defaultName) => ipcRenderer.invoke('workflow:save', data, defaultName),
  openWorkflow: () => ipcRenderer.invoke('workflow:open'),
  selectMedia: (filter) => ipcRenderer.invoke('media:select', filter),
  renderSceneVideo: (options) => ipcRenderer.invoke('video:renderScene', options),
  getRenderStatus: (jobId) => ipcRenderer.invoke('video:getRenderStatus', jobId),
  saveBase64File: (options) => ipcRenderer.invoke('media:saveBase64', options),
  listProviders: () => ipcRenderer.invoke('api-settings:listProviders'),
  getProviderConfig: (providerId) => ipcRenderer.invoke('api-settings:getProviderConfig', providerId),
  saveProviderKey: (options) => ipcRenderer.invoke('api-settings:saveProviderKey', options),
  removeProviderKey: (providerId) => ipcRenderer.invoke('api-settings:removeProviderKey', providerId),
  testProviderConnection: (options) => ipcRenderer.invoke('api-settings:testConnection', options),
  setDefaultProvider: (providerId) => ipcRenderer.invoke('api-settings:setDefaultProvider', providerId),
  auth: {
    getStatus: () => ipcRenderer.invoke('auth:getStatus'),
    loginGoogle: (options) => ipcRenderer.invoke('auth:loginGoogle', options),
    handleCallback: (url) => ipcRenderer.invoke('auth:handleCallback', url),
    logout: () => ipcRenderer.invoke('auth:logout'),
    refresh: () => ipcRenderer.invoke('auth:refresh'),
    getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),
    getProviderCapabilities: () => ipcRenderer.invoke('auth:getProviderCapabilities'),
    onStatusChanged: (callback) => {
      const listener = (_event, status) => callback(status);
      ipcRenderer.on('auth:statusChanged', listener);
      return () => ipcRenderer.removeListener('auth:statusChanged', listener);
    }
  },
  cloud: {
    ensureProfile: () => ipcRenderer.invoke('cloud:ensureProfile'),
    listWorkflows: () => ipcRenderer.invoke('cloud:listWorkflows'),
    saveWorkflow: (input) => ipcRenderer.invoke('cloud:saveWorkflow', input),
    getWorkflow: (workflowId) => ipcRenderer.invoke('cloud:getWorkflow', workflowId),
    createRenderJob: (input) => ipcRenderer.invoke('cloud:createRenderJob', input)
  },
  update: {
    checkForUpdates: () => ipcRenderer.invoke('update:check'),
    downloadUpdate: () => ipcRenderer.invoke('update:download'),
    installUpdate: () => ipcRenderer.invoke('update:install'),
    getUpdateStatus: () => ipcRenderer.invoke('update:getStatus'),
    getDiagnostics: () => ipcRenderer.invoke('update:getDiagnostics'),
    setBlocked: (reason) => ipcRenderer.invoke('update:setBlocked', reason),
    clearBlocked: () => ipcRenderer.invoke('update:clearBlocked'),
    onUpdateStatus: (callback) => {
      const listener = (_event, status) => callback(status);
      ipcRenderer.on('update:status', listener);
      return () => ipcRenderer.removeListener('update:status', listener);
    }
  },
  system: {
    runHealthCheck: (input) => ipcRenderer.invoke('system:healthCheck', input),
    getDiagnosticLog: (extra) => ipcRenderer.invoke('system:getDiagnosticLog', extra),
    restartApp: () => ipcRenderer.invoke('app:restart')
  }
});
