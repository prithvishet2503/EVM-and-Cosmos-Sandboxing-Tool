import { ipcMain, app } from 'electron';
import { generateAccount } from '../../core/account/generator.js';
import { createWeb3Instance } from '../../core/blockchain/web3Utils.js';
import fs from 'fs';
import path from 'path';

const USER_DATA_PATH = app.getPath('userData');
const ACCOUNTS_DIR = path.join(USER_DATA_PATH, 'accounts');

// Ensure accounts directory exists
if (!fs.existsSync(ACCOUNTS_DIR)) {
  fs.mkdirSync(ACCOUNTS_DIR, { recursive: true });
}

export function registerAccountHandlers() {
  // Generate new account
  ipcMain.handle('account:generate', async (_event, rpcUrl: string) => {
    try {
      const web3 = createWeb3Instance(rpcUrl);
      const sender = generateAccount(web3);
      const receiver = generateAccount(web3);
      const secondAccount = generateAccount(web3);

      return {
        success: true,
        data: { sender, receiver, secondAccount },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Save accounts for a chain
  ipcMain.handle('account:save', async (_event, chainName: string, accounts: any) => {
    try {
      const filePath = path.join(ACCOUNTS_DIR, `${chainName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(accounts, null, 2));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Load accounts for a chain
  ipcMain.handle('account:load', async (_event, chainName: string) => {
    try {
      const filePath = path.join(ACCOUNTS_DIR, `${chainName}.json`);
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'Accounts not found' };
      }
      const accounts = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return { success: true, data: accounts };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
