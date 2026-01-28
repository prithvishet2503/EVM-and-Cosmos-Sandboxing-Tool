import { CosmosChainConfig, CosmosAccount } from './cosmosTypes';

export abstract class CosmosConfig {
  abstract chainName: string;
  abstract chainId: string;
  abstract rpc: string;
  abstract denom: string;
  abstract addressPrefix: string;

  // Accounts
  sender: CosmosAccount = { mnemonic: '', address: '' };
  receiver: CosmosAccount = { mnemonic: '', address: '' };
  secondAccount: CosmosAccount = { mnemonic: '', address: '' };

  // Default values
  get transactionAmount(): string {
    return '100000'; // in base units (e.g., uatom)
  }

  get gasAmount(): string {
    return '5000';
  }

  get gasLimit(): string {
    return '200000';
  }
}

export class CosmosChainConfigAdapter extends CosmosConfig {
  chainName: string;
  chainId: string;
  rpc: string;
  denom: string;
  addressPrefix: string;

  constructor(config: CosmosChainConfig & {
    sender: CosmosAccount;
    receiver: CosmosAccount;
    secondAccount: CosmosAccount;
  }) {
    super();
    this.chainName = config.chainName;
    this.chainId = config.chainId;
    this.rpc = config.rpc;
    this.denom = config.denom;
    this.addressPrefix = config.addressPrefix;
    this.sender = config.sender;
    this.receiver = config.receiver;
    this.secondAccount = config.secondAccount;
  }
}
