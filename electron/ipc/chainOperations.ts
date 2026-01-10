import { ipcMain } from 'electron';
import { sendToRenderer } from '../main.js';
import { executeTransfer } from '../../core/blockchain/legacyTransfers.js';
import { executeTssTransfer } from '../../core/blockchain/tssTransfers.js';
import { RpcMethodTester } from '../../core/blockchain/rpcMethodTester.js';
import { createWeb3Instance, getBalance } from '../../core/blockchain/web3Utils.js';
import { ChainConfigAdapter } from '../../core/config/chainConfigAdapter.js';

interface ChainConfig {
  rpc: string;
  chainId: number;
  networkId: number;
  chainName: string;
  nativeSymbol?: string;
  sender: { address: string; privateKey: string };
  receiver: { address: string; privateKey: string };
  secondAccount: { address: string; privateKey: string };
}

export function registerChainOperationsHandlers() {
  // Test chain with all operations
  ipcMain.handle('chain:test', async (_event, chainConfig: ChainConfig) => {
    try {
      const results: any = {
        chainConfig: {
          chainName: chainConfig.chainName,
          chainId: chainConfig.chainId,
          rpc: chainConfig.rpc,
          nativeSymbol: chainConfig.nativeSymbol || 'ETH',
        }
      };

      // Send progress updates
      sendToRenderer('progress:update', {
        currentStep: 'Checking balance',
        progress: 1,
        total: 6,
        status: 'running',
      });

      // 1. Get balance
      const web3 = createWeb3Instance(chainConfig.rpc);
      const balanceWei = await web3.eth.getBalance(chainConfig.sender.address);
      const balanceEth = web3.utils.fromWei(balanceWei, 'ether');
      results.balance = {
        success: true,
        data: { address: chainConfig.sender.address, balance: balanceEth },
      };

      sendToRenderer('progress:update', {
        currentStep: 'Executing Legacy Tx - EIP-155 (Type 0)',
        progress: 2,
        total: 6,
        status: 'running',
      });

      // 2. Execute legacy transfer
      try {
        const configAdapter = new ChainConfigAdapter(chainConfig);
        const transferResult = await executeTransfer(configAdapter, {});
        results.legacyTransfer = {
          success: true,
          data: transferResult,
        };
      } catch (error: any) {
        results.legacyTransfer = {
          success: false,
          error: error.message,
        };
      }

      sendToRenderer('progress:update', {
        currentStep: 'Executing EIP-1559 Tx (Type 2)',
        progress: 3,
        total: 6,
        status: 'running',
      });

      // 3. Execute TSS transfer (may fail, that's ok)
      try {
        const configAdapter = new ChainConfigAdapter(chainConfig);
        const tssResult = await executeTssTransfer(configAdapter, {});
        results.tssTransfer = {
          success: true,
          data: tssResult,
        };
      } catch (error: any) {
        results.tssTransfer = {
          success: false,
          error: error.message,
        };
      }

      sendToRenderer('progress:update', {
        currentStep: 'Testing RPC methods',
        progress: 4,
        total: 6,
        status: 'running',
      });

      // 4. Test RPC methods
      const tester = new RpcMethodTester(chainConfig.rpc, chainConfig.chainName);
      const rpcReport = await tester.testAllMethods();
      results.rpcTesting = {
        success: true,
        data: rpcReport,
      };

      sendToRenderer('progress:update', {
        currentStep: 'Complete',
        progress: 6,
        total: 6,
        status: 'completed',
      });

      sendToRenderer('test:complete', results);
      return results;
    } catch (error: any) {
      sendToRenderer('progress:update', {
        currentStep: 'Error',
        progress: 0,
        total: 6,
        status: 'error',
        message: error.message,
      });
      throw error;
    }
  });

  // Execute single transfer
  ipcMain.handle('chain:transfer', async (_event, chainConfig: ChainConfig, params: any) => {
    try {
      const configAdapter = new ChainConfigAdapter(chainConfig);
      const result = await executeTransfer(configAdapter, params);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Execute TSS transfer
  ipcMain.handle('chain:tss-transfer', async (_event, chainConfig: ChainConfig, params: any) => {
    try {
      const configAdapter = new ChainConfigAdapter(chainConfig);
      const result = await executeTssTransfer(configAdapter, params);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Test RPC methods only
  ipcMain.handle('chain:test-rpc', async (_event, chainConfig: ChainConfig) => {
    try {
      const tester = new RpcMethodTester(chainConfig.rpc, chainConfig.chainName);
      const report = await tester.testAllMethods();
      return { success: true, data: report };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
