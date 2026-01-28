import { SigningStargateClient, StargateClient } from '@cosmjs/stargate';
import { DirectSecp256k1HdWallet, OfflineDirectSigner } from '@cosmjs/proto-signing';
import { CosmosConfig } from './cosmosConfig';
import { CosmosTransferParams, CosmosTransferResult, CosmosTxFee } from './cosmosTypes';
import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx';

export class CosmosTransferService {
  private config: CosmosConfig;

  constructor(config: CosmosConfig) {
    this.config = config;
  }

  /**
   * Execute a simple Cosmos transfer using mnemonic-based signing
   */
  async executeSimpleTransfer(params: CosmosTransferParams = {}): Promise<CosmosTransferResult> {
    try {
      console.log('🔄 Executing Cosmos Transfer...');

      // Create signer from mnemonic
      const signer: OfflineDirectSigner = await DirectSecp256k1HdWallet.fromMnemonic(
        this.config.sender.mnemonic,
        { prefix: this.config.addressPrefix }
      );

      const sender = (await signer.getAccounts())[0].address;
      console.log(`📤 Sender: ${sender}`);

      // Connect to the chain with signer
      const signingClient = await SigningStargateClient.connectWithSigner(
        this.config.rpc,
        signer
      );

      console.log(`⛓️  Chain ID: ${await signingClient.getChainId()}`);
      console.log(`📦 Current Height: ${await signingClient.getHeight()}`);

      // Check balance before transfer
      const senderBalance = await signingClient.getAllBalances(sender);
      console.log('💰 Sender Balance:', senderBalance);

      // Prepare transfer parameters
      const receiver = params.to ?? this.config.receiver.address;
      const amount = params.amount ?? this.config.transactionAmount;
      const denom = params.denom ?? this.config.denom;

      // Create fee
      const fee: CosmosTxFee = {
        amount: [{ denom, amount: this.config.gasAmount }],
        gas: this.config.gasLimit,
      };

      console.log(`📤 Sending ${amount} ${denom} to ${receiver}`);

      // Execute transfer
      const result = await signingClient.sendTokens(
        sender,
        receiver,
        [{ denom, amount }],
        fee,
        'Transfer via BitGo Sandbox Tool'
      );

      console.log('🎉 Transaction successful!');
      console.log(`📋 TX Hash: ${result.transactionHash}`);
      console.log(`📦 Block Height: ${result.height}`);

      // Check balance after transfer
      const finalBalance = await signingClient.getAllBalances(sender);
      console.log('💰 Final Balance:', finalBalance);

      return {
        transactionHash: result.transactionHash,
        blockHeight: result.height,
        from: sender,
        to: receiver,
        amount,
        denom,
        gasUsed: result.gasUsed.toString(),
      };
    } catch (error: any) {
      console.error('❌ Transfer failed:', error.message);
      throw error;
    }
  }

  /**
   * Execute a step-by-step Cosmos transfer (sign then broadcast)
   */
  async executeStepByStepTransfer(params: CosmosTransferParams = {}): Promise<CosmosTransferResult> {
    try {
      console.log('🔄 Executing Step-by-Step Cosmos Transfer...');

      // Create signer from mnemonic
      const signer: OfflineDirectSigner = await DirectSecp256k1HdWallet.fromMnemonic(
        this.config.sender.mnemonic,
        { prefix: this.config.addressPrefix }
      );

      const sender = (await signer.getAccounts())[0].address;

      // Connect to the chain with signer
      const signingClient = await SigningStargateClient.connectWithSigner(
        this.config.rpc,
        signer
      );

      // Prepare parameters
      const receiver = params.to ?? this.config.receiver.address;
      const amount = params.amount ?? this.config.transactionAmount;
      const denom = params.denom ?? this.config.denom;

      // Create message
      const sendMessage = {
        typeUrl: '/cosmos.bank.v1beta1.MsgSend',
        value: {
          fromAddress: sender,
          toAddress: receiver,
          amount: [{ denom, amount }],
        },
      };

      // Create fee
      const fee: CosmosTxFee = {
        amount: [{ denom, amount: this.config.gasAmount }],
        gas: this.config.gasLimit,
      };

      console.log('🔏 Signing transaction...');

      // Sign transaction
      const txRaw = await signingClient.sign(
        sender,
        [sendMessage],
        fee,
        'Transfer via BitGo Sandbox Tool'
      );

      // Encode transaction
      const txBytes = TxRaw.encode(txRaw).finish();

      console.log('📡 Broadcasting transaction...');

      // Broadcast transaction
      const result = await signingClient.broadcastTx(txBytes, 60_000, 3_000);

      console.log('🎉 Transaction successful!');
      console.log(`📋 TX Hash: ${Buffer.from(result.transactionHash).toString('hex')}`);
      console.log(`📦 Block Height: ${result.height}`);

      const txHash = Buffer.from(result.transactionHash).toString('hex').toUpperCase();

      return {
        transactionHash: txHash,
        blockHeight: result.height,
        from: sender,
        to: receiver,
        amount,
        denom,
        gasUsed: result.gasUsed.toString(),
      };
    } catch (error: any) {
      console.error('❌ Transfer failed:', error.message);
      throw error;
    }
  }

  /**
   * Check balance for an address
   */
  async checkBalance(address: string) {
    try {
      const client = await StargateClient.connect(this.config.rpc);
      const balances = await client.getAllBalances(address);

      console.log(`💰 Balance for ${address}:`);
      balances.forEach(coin => {
        console.log(`  ${coin.amount} ${coin.denom}`);
      });

      return balances;
    } catch (error: any) {
      console.error('❌ Failed to check balance:', error.message);
      throw error;
    }
  }

  /**
   * Get chain details
   */
  async getChainDetails() {
    try {
      const client = await StargateClient.connect(this.config.rpc);
      const chainId = await client.getChainId();
      const height = await client.getHeight();

      console.log(`⛓️  Chain ID: ${chainId}`);
      console.log(`📦 Current Height: ${height}`);

      return { chainId, height };
    } catch (error: any) {
      console.error('❌ Failed to get chain details:', error.message);
      throw error;
    }
  }
}
