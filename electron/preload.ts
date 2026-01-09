import { contextBridge, ipcRenderer } from 'electron';

// Define the API interface
export interface ElectronAPI {
  // Chain operations
  testChain: (chainConfig: any) => Promise<any>;
  executeTransfer: (chainConfig: any, params: any) => Promise<any>;
  executeTssTransfer: (chainConfig: any, params: any) => Promise<any>;
  testRpcMethods: (chainConfig: any) => Promise<any>;

  // Account operations
  generateAccount: (rpcUrl: string) => Promise<any>;
  saveAccounts: (chainName: string, accounts: any) => Promise<void>;
  loadAccounts: (chainName: string) => Promise<any>;

  // Config operations
  saveChainConfig: (chainName: string, config: any) => Promise<void>;
  loadChainConfig: (chainName: string) => Promise<any>;
  listChainConfigs: () => Promise<string[]>;
  deleteChainConfig: (chainName: string) => Promise<void>;

  // Report operations
  exportReport: (results: any) => Promise<any>;

  // Progress updates
  onProgressUpdate: (callback: (data: any) => void) => () => void;
  onTestComplete: (callback: (data: any) => void) => () => void;
}

// Expose protected methods to the renderer process
const electronAPI: ElectronAPI = {
  // Chain operations
  testChain: (chainConfig: any) => ipcRenderer.invoke('chain:test', chainConfig),
  executeTransfer: (chainConfig: any, params: any) =>
    ipcRenderer.invoke('chain:transfer', chainConfig, params),
  executeTssTransfer: (chainConfig: any, params: any) =>
    ipcRenderer.invoke('chain:tss-transfer', chainConfig, params),
  testRpcMethods: (chainConfig: any) =>
    ipcRenderer.invoke('chain:test-rpc', chainConfig),

  // Account operations
  generateAccount: (rpcUrl: string) =>
    ipcRenderer.invoke('account:generate', rpcUrl),
  saveAccounts: (chainName: string, accounts: any) =>
    ipcRenderer.invoke('account:save', chainName, accounts),
  loadAccounts: (chainName: string) =>
    ipcRenderer.invoke('account:load', chainName),

  // Config operations
  saveChainConfig: (chainName: string, config: any) =>
    ipcRenderer.invoke('config:save', chainName, config),
  loadChainConfig: (chainName: string) =>
    ipcRenderer.invoke('config:load', chainName),
  listChainConfigs: () =>
    ipcRenderer.invoke('config:list'),
  deleteChainConfig: (chainName: string) =>
    ipcRenderer.invoke('config:delete', chainName),

  // Report operations
  exportReport: (results: any) =>
    ipcRenderer.invoke('report:export', results),

  // Progress updates
  onProgressUpdate: (callback: (data: any) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on('progress:update', subscription);
    return () => ipcRenderer.removeListener('progress:update', subscription);
  },
  onTestComplete: (callback: (data: any) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on('test:complete', subscription);
    return () => ipcRenderer.removeListener('test:complete', subscription);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
