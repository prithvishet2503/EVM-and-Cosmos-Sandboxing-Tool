import { ipcMain, app } from 'electron';
import fs from 'fs';
import path from 'path';

const USER_DATA_PATH = app.getPath('userData');
const CONFIGS_DIR = path.join(USER_DATA_PATH, 'configs');

// Ensure configs directory exists
if (!fs.existsSync(CONFIGS_DIR)) {
  fs.mkdirSync(CONFIGS_DIR, { recursive: true });
}

export function registerConfigHandlers() {
  // Save chain configuration
  ipcMain.handle('config:save', async (_event, chainName: string, config: any) => {
    try {
      const filePath = path.join(CONFIGS_DIR, `${chainName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Load chain configuration
  ipcMain.handle('config:load', async (_event, chainName: string) => {
    try {
      const filePath = path.join(CONFIGS_DIR, `${chainName}.json`);
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'Configuration not found' };
      }
      const config = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return { success: true, data: config };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // List all chain configurations
  ipcMain.handle('config:list', async () => {
    try {
      const files = fs.readdirSync(CONFIGS_DIR);
      const chains = files
        .filter((file) => file.endsWith('.json'))
        .map((file) => file.replace('.json', ''));
      return { success: true, data: chains };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Delete chain configuration
  ipcMain.handle('config:delete', async (_event, chainName: string) => {
    try {
      const filePath = path.join(CONFIGS_DIR, `${chainName}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
