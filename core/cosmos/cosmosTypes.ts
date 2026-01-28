// Cosmos-specific types and interfaces

export interface CosmosAccount {
  mnemonic: string;
  address: string;
}

export interface CosmosChainConfig {
  chainName: string;
  chainId: string;
  rpc: string;
  denom: string;
  addressPrefix: string;
  jiraTicket?: string;
}

export interface CosmosTransferParams {
  from?: string;
  to?: string;
  amount?: string;
  denom?: string;
}

export interface CosmosTransferResult {
  transactionHash: string;
  blockHeight: number;
  from: string;
  to: string;
  amount: string;
  denom: string;
  gasUsed: string;
}

export interface CosmosTxFee {
  amount: Array<{ denom: string; amount: string }>;
  gas: string;
}

export interface CosmosBalance {
  denom: string;
  amount: string;
}
