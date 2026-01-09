import { Config } from './base.js';
import Web3 from 'web3';

interface ChainConfigData {
  rpc: string;
  chainId: number;
  networkId: number;
  chainName: string;
  sender: { address: string; privateKey: string };
  receiver: { address: string; privateKey: string };
  secondAccount: { address: string; privateKey: string };
}

export class ChainConfigAdapter extends Config {
  rpc: string;
  chainId: number;
  networkId: number;
  chainName: string;
  private web3: Web3;

  constructor(configData: ChainConfigData) {
    super();
    this.rpc = configData.rpc;
    this.chainId = configData.chainId;
    this.networkId = configData.networkId;
    this.chainName = configData.chainName;
    this.sender = configData.sender;
    this.receiver = configData.receiver;
    this.secondAccount = configData.secondAccount;
    this.web3 = new Web3(this.rpc);
  }

  async getGasLimit(sender?: string, receiver?: string): Promise<string> {
    try {
      // Try to estimate gas limit
      if (sender && receiver) {
        const gasEstimate = await this.web3.eth.estimateGas({
          from: sender,
          to: receiver,
          value: this.web3.utils.toWei(this.value, 'ether'),
        });
        return gasEstimate.toString();
      }
    } catch (error) {
      console.log('Gas estimation failed, using default:', error);
    }
    // Default gas limit for simple transfers
    return '21000';
  }

  async getGasPrice(): Promise<BigInt> {
    try {
      const gasPrice = await this.web3.eth.getGasPrice();
      return BigInt(gasPrice.toString());
    } catch (error) {
      console.log('Failed to get gas price, using default:', error);
      // Default gas price (5 gwei)
      return BigInt('5000000000');
    }
  }

  get value(): string {
    return '0.001'; // Default transfer value
  }
}
