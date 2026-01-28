import { ipcMain } from 'electron';
import { sendToRenderer } from '../main.js';
import { executeTransfer } from '../../core/blockchain/legacyTransfers.js';
import { executeTssTransfer } from '../../core/blockchain/tssTransfers.js';
import { RpcMethodTester } from '../../core/blockchain/rpcMethodTester.js';
import { createWeb3Instance } from '../../core/blockchain/web3Utils.js';
import { ChainConfigAdapter } from '../../core/config/chainConfigAdapter.js';
import { CosmosTransferService } from '../../core/cosmos/cosmosTransfer.js';
import { CosmosTssTransferService } from '../../core/cosmos/cosmosTssTransfer.js';
import { CosmosChainConfigAdapter } from '../../core/cosmos/cosmosConfig.js';
import { StargateClient } from '@cosmjs/stargate';

interface EVMChainConfig {
  chainType: 'evm';
  rpc: string;
  chainId: number;
  networkId: number;
  chainName: string;
  nativeSymbol?: string;
  sender: { address: string; privateKey: string };
  receiver: { address: string; privateKey: string };
  secondAccount: { address: string; privateKey: string };
}

interface CosmosChainConfig {
  chainType: 'cosmos';
  rpc: string;
  chainId: string;
  chainName: string;
  denom: string;
  addressPrefix: string;
  sender: { address: string; mnemonic: string };
  receiver: { address: string; mnemonic: string };
  secondAccount: { address: string; mnemonic: string };
}

type ChainConfig = EVMChainConfig | CosmosChainConfig;

export function registerChainOperationsHandlers() {
  // Test chain with all operations
  ipcMain.handle('chain:test', async (_event, chainConfig: ChainConfig) => {
    try {
      // Handle Cosmos chains
      if (chainConfig.chainType === 'cosmos') {
        const results: any = {
          chainConfig: {
            chainName: chainConfig.chainName,
            chainId: chainConfig.chainId,
            rpc: chainConfig.rpc,
            denom: chainConfig.denom,
            addressPrefix: chainConfig.addressPrefix,
          }
        };

        // Send progress updates
        sendToRenderer('progress:update', {
          currentStep: 'Checking balance',
          progress: 1,
          total: 4,
          status: 'running',
        });

        // 1. Get balance
        try {
          const client = await StargateClient.connect(chainConfig.rpc);
          const coins = await client.getAllBalances(chainConfig.sender.address);
          const coin = coins.find((c) => c.denom === chainConfig.denom);
          const balance = coin ? (parseInt(coin.amount) / 1_000_000).toFixed(6) : '0';
          results.balance = {
            success: true,
            data: { address: chainConfig.sender.address, balance, denom: chainConfig.denom },
          };
          client.disconnect();
        } catch (error: any) {
          results.balance = {
            success: false,
            error: error.message,
          };
        }

        sendToRenderer('progress:update', {
          currentStep: 'Executing Simple Transfer',
          progress: 2,
          total: 4,
          status: 'running',
        });

        // 2. Execute simple transfer
        try {
          const cosmosConfig = new CosmosChainConfigAdapter(chainConfig);
          const transferService = new CosmosTransferService(cosmosConfig);
          const transferResult = await transferService.executeSimpleTransfer({
            to: chainConfig.receiver.address,
            amount: '0.001'
          });
          results.simpleTransfer = {
            success: true,
            data: transferResult,
          };
        } catch (error: any) {
          results.simpleTransfer = {
            success: false,
            error: error.message,
          };
        }

        sendToRenderer('progress:update', {
          currentStep: 'Executing Step-by-Step Transfer',
          progress: 3,
          total: 4,
          status: 'running',
        });

        // 3. Execute step-by-step transfer
        try {
          const cosmosConfig = new CosmosChainConfigAdapter(chainConfig);
          const transferService = new CosmosTransferService(cosmosConfig);
          const stepResult = await transferService.executeStepByStepTransfer({
            to: chainConfig.secondAccount.address,
            amount: '0.001'
          });
          results.stepByStepTransfer = {
            success: true,
            data: stepResult,
          };
        } catch (error: any) {
          results.stepByStepTransfer = {
            success: false,
            error: error.message,
          };
        }

        sendToRenderer('progress:update', {
          currentStep: 'Complete',
          progress: 4,
          total: 4,
          status: 'completed',
        });

        sendToRenderer('test:complete', results);
        return results;
      }

      // Handle EVM chains
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
      if (chainConfig.chainType === 'cosmos') {
        const cosmosConfig = new CosmosChainConfigAdapter(chainConfig);
        const transferService = new CosmosTransferService(cosmosConfig);
        const result = await transferService.executeSimpleTransfer({
          to: params.to || chainConfig.receiver.address,
          amount: params.amount || '0.001'
        });
        return { success: true, data: result };
      } else {
        const configAdapter = new ChainConfigAdapter(chainConfig);
        const result = await executeTransfer(configAdapter, params);
        return { success: true, data: result };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Execute TSS transfer
  ipcMain.handle('chain:tss-transfer', async (_event, chainConfig: ChainConfig, params: any) => {
    try {
      if (chainConfig.chainType === 'cosmos') {
        const cosmosConfig = new CosmosChainConfigAdapter(chainConfig);
        const tssService = new CosmosTssTransferService(cosmosConfig);
        // For TSS, we need the TSS shares which would be provided in params
        const result = await tssService.executeTssTransfer(
          params.tssShares,
          params.accountNumber || 0,
          params.sequence || 0
        );
        return { success: true, data: result };
      } else {
        const configAdapter = new ChainConfigAdapter(chainConfig);
        const result = await executeTssTransfer(configAdapter, params);
        return { success: true, data: result };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Test RPC methods only (EVM only)
  ipcMain.handle('chain:test-rpc', async (_event, chainConfig: ChainConfig) => {
    try {
      if (chainConfig.chainType === 'cosmos') {
        // RPC method testing is not applicable for Cosmos chains
        return { success: false, error: 'RPC method testing is not applicable for Cosmos chains' };
      }
      const tester = new RpcMethodTester(chainConfig.rpc, chainConfig.chainName);
      const report = await tester.testAllMethods();
      return { success: true, data: report };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
