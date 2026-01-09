// Account types
export interface Account {
  privateKey: string;
  address: string;
}

// Transfer types
export interface TransferParams {
  from?: string;
  fromPvtKey?: string;
  to?: string;
  value?: string;
}

export interface TransferResult {
  transactionHash: string;
  blockNumber: string;
  from: string;
  to: string;
  status: boolean;
  gasUsed: string;
}

// Chain configuration types
export interface ChainConfig {
  rpc: string;
  chainId: number;
  networkId: number;
  chainName: string;
  sender: Account;
  receiver: Account;
  secondAccount: Account;
}

// RPC Testing types
export interface RpcTestResult {
  method: string;
  category: string;
  supported: boolean;
  response?: any;
  error?: string;
  executionTime?: number;
}

export interface RpcTestReport {
  chainName: string;
  rpcUrl: string;
  timestamp: string;
  results: RpcTestResult[];
  summary: {
    total: number;
    supported: number;
    unsupported: number;
    successRate: string;
  };
}

// Test execution types
export interface TestProgress {
  currentStep: string;
  progress: number;
  total: number;
  status: 'pending' | 'running' | 'completed' | 'error';
  message?: string;
}

export interface ActionResults {
  [key: string]: {
    success: boolean;
    error?: string;
    timestamp: string;
    data?: any;
  };
}
