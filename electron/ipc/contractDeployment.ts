import { ipcMain } from 'electron';
import { createWeb3Instance } from '../../core/blockchain/web3Utils.js';
import Web3 from 'web3';
import { WALLET_SIMPLE_BYTECODE, WALLET_FACTORY_BYTECODE, FORWARDER_V4_BYTECODE, FORWARDER_FACTORY_V4_BYTECODE } from './contractBytecodes.js';
import { AbiCoder } from 'ethers';


interface DeploymentParams {
  contractName: string;
  rpc: string;
  privateKey: string;
  nonce: number;
  previousAddress?: string;
}

export function registerContractDeploymentHandlers() {
  // Get gas price
  ipcMain.handle('contract:getGasPrice', async (_event, rpcUrl: string) => {
    try {
      const web3 = createWeb3Instance(rpcUrl);
      const gasPrice = await web3.eth.getGasPrice();
      return gasPrice.toString();
    } catch (error: any) {
      throw new Error(`Failed to get gas price: ${error.message}`);
    }
  });

  // Get nonce
  ipcMain.handle('contract:getNonce', async (_event, rpcUrl: string, address: string) => {
    try {
      const web3 = createWeb3Instance(rpcUrl);
      const nonce = await web3.eth.getTransactionCount(address);
      return nonce;
    } catch (error: any) {
      throw new Error(`Failed to get nonce: ${error.message}`);
    }
  });

  // Deploy contract
  ipcMain.handle('contract:deploy', async (_event, params: DeploymentParams) => {
    try {
      const web3 = createWeb3Instance(params.rpc);
      const account = web3.eth.accounts.privateKeyToAccount(params.privateKey);

      // Validate private key format
      if (!params.privateKey.startsWith('0x') || params.privateKey.length !== 66) {
        throw new Error('Invalid private key format');
      }

      let bytecode: string;
      let constructorArgs: any[] = [];
      let constructorTypes: string[] = [];

      // Select bytecode and constructor args based on contract name
      switch (params.contractName) {
        case 'walletImplementation':
          bytecode = WALLET_SIMPLE_BYTECODE;
          break;
        case 'walletFactory':
          if (!params.previousAddress) {
            throw new Error('WalletFactory requires WalletSimple implementation address');
          }
          bytecode = WALLET_FACTORY_BYTECODE;
          constructorArgs = [params.previousAddress];
          constructorTypes = ['address'];
          break;
        case 'forwarderImplementation':
          bytecode = FORWARDER_V4_BYTECODE;
          break;
        case 'forwarderFactory':
          if (!params.previousAddress) {
            throw new Error('ForwarderFactory requires ForwarderV4 implementation address');
          }
          bytecode = FORWARDER_FACTORY_V4_BYTECODE;
          constructorArgs = [params.previousAddress];
          constructorTypes = ['address'];
          break;
        default:
          throw new Error(`Unknown contract: ${params.contractName}`);
      }

      // Encode constructor arguments if needed
      let deployBytecode = bytecode;
      if (constructorArgs.length > 0) {
        const abiCoder = AbiCoder.defaultAbiCoder();
        const encodedArgs = abiCoder.encode(constructorTypes, constructorArgs);
        deployBytecode = bytecode + encodedArgs.slice(2); // Remove 0x prefix from encoded args
      }

      // Check balance before deployment
      const balance = await web3.eth.getBalance(account.address);
      const gasPrice = await web3.eth.getGasPrice();

      // Estimate gas with the full bytecode including constructor args
      const gasEstimate = await web3.eth.estimateGas({
        from: account.address,
        data: deployBytecode,
      });

      const requiredBalance = BigInt(gasEstimate) * BigInt(gasPrice) * BigInt(150) / BigInt(100); // 50% buffer
      if (BigInt(balance) < requiredBalance) {
        const requiredEth = Number(requiredBalance) / 1e18;
        const currentEth = Number(balance) / 1e18;
        throw new Error(
          `Insufficient balance. Required: ${requiredEth.toFixed(6)} ETH, Available: ${currentEth.toFixed(6)} ETH`
        );
      }

      // Create and sign transaction with 50% gas buffer for safety
      const tx = {
        from: account.address,
        data: deployBytecode,
        gas: Math.floor(Number(gasEstimate) * 1.5), // 50% buffer for safety
        gasPrice: gasPrice.toString(),
        nonce: params.nonce,
      };

      const signedTx = await account.signTransaction(tx);

      // Send transaction with timeout
      const receiptPromise = web3.eth.sendSignedTransaction(signedTx.rawTransaction!);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Transaction confirmation timeout (5 minutes)')), 300000)
      );

      const receipt = await Promise.race([receiptPromise, timeoutPromise]) as any;

      // Validate receipt
      if (!receipt) {
        throw new Error('No receipt received from transaction');
      }

      if (!receipt.status) {
        throw new Error('Transaction reverted on-chain');
      }

      if (!receipt.contractAddress) {
        throw new Error('Contract address not found in receipt');
      }

      // Calculate actual deployment cost
      const deploymentCost = (BigInt(receipt.gasUsed) * BigInt(gasPrice)) / BigInt(1e18);

      return {
        success: true,
        address: receipt.contractAddress,
        transactionHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString(),
        cost: deploymentCost.toString(),
      };
    } catch (error: any) {
      // Enhanced error messages
      let errorMessage = error.message;

      if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient balance for deployment. Please fund your account and try again.';
      } else if (error.message.includes('nonce')) {
        errorMessage = 'Nonce error. Please refresh and try again, or check for pending transactions.';
      } else if (error.message.includes('gas')) {
        errorMessage = 'Gas estimation failed. Check network connectivity and RPC endpoint.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Transaction confirmation timeout. Check the transaction on block explorer.';
      } else if (error.message.includes('reverted')) {
        errorMessage = 'Transaction reverted. Contract deployment failed on-chain.';
      }

      return {
        success: false,
        error: errorMessage,
        address: '',
        transactionHash: '',
        gasUsed: '0',
        cost: '0',
      };
    }
  });

  // Fetch contract bytecode from GitHub (for actual implementation)
  ipcMain.handle('contract:fetchBytecode', async (_event, contractName: string) => {
    try {
      // This would fetch compiled bytecode from the eth-multisig-v4 repo
      // For now, returning placeholder
      return {
        success: true,
        bytecode: '0x608060...',
        abi: [],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  });
}
