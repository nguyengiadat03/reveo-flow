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
  setDefaultProvider: (providerId) => ipcRenderer.invoke('api-settings:setDefaultProvider', providerId)
});
