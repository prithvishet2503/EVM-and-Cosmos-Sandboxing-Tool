import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { CheckCircle2, XCircle, Loader2, FileText, AlertCircle } from 'lucide-react';
import type { EVMChainConfig } from '../App';

interface ContractDeploymentProps {
  chainConfig: EVMChainConfig;
  onDeploymentComplete: (results: DeploymentResults) => void;
}

export interface DeploymentResults {
  success: boolean;
  contracts: {
    walletImplementation?: ContractDeployment;
    walletFactory?: ContractDeployment;
    forwarderImplementation?: ContractDeployment;
    forwarderFactory?: ContractDeployment;
  };
  totalGasUsed: string;
  totalCostEth: string;
  totalCostUsd?: string;
  deploymentTime: number;
  errors: string[];
}

interface ContractDeployment {
  name: string;
  address: string;
  gasUsed: string;
  transactionHash: string;
  deploymentCost: string;
  nonce: number;
  status: 'pending' | 'deploying' | 'success' | 'failed';
}

const CONTRACT_GAS_ESTIMATES = {
  walletImplementation: 1500000,
  walletFactory: 800000,
  forwarderImplementation: 1200000,
  forwarderFactory: 700000,
};

export function ContractDeployment({ chainConfig, onDeploymentComplete }: ContractDeploymentProps) {
  const [deploying, setDeploying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [deploymentResults, setDeploymentResults] = useState<DeploymentResults | null>(null);
  const [showEstimate, setShowEstimate] = useState(true);

  const contracts = [
    { key: 'walletImplementation', name: 'Wallet Implementation (WalletSimple)', nonce: 0 },
    { key: 'walletFactory', name: 'Wallet Factory', nonce: 1 },
    { key: 'forwarderImplementation', name: 'Forwarder Implementation (ForwarderV4)', nonce: 2 },
    { key: 'forwarderFactory', name: 'Forwarder Factory (ForwarderFactoryV4)', nonce: 3 },
  ];

  const calculateEstimate = async () => {
    try {
      const gasPrice = await window.electronAPI.getGasPrice(chainConfig.rpc);
      const totalGas = Object.values(CONTRACT_GAS_ESTIMATES).reduce((a, b) => a + b, 0);
      const totalCostWei = BigInt(totalGas) * BigInt(gasPrice);
      const totalCostEth = (Number(totalCostWei) / 1e18).toFixed(6);

      return {
        totalGas,
        gasPrice: parseInt(gasPrice),
        totalCostEth,
        breakdown: Object.entries(CONTRACT_GAS_ESTIMATES).map(([key, gas]) => ({
          name: key,
          gasEstimate: gas,
          costEth: ((BigInt(gas) * BigInt(gasPrice)) / BigInt(1e18)).toString(),
        })),
      };
    } catch (error) {
      console.error('Failed to calculate estimate:', error);
      return null;
    }
  };

  const deployContracts = async () => {
    setDeploying(true);
    setShowEstimate(false);
    const startTime = Date.now();
    const results: DeploymentResults = {
      success: false,
      contracts: {},
      totalGasUsed: '0',
      totalCostEth: '0',
      deploymentTime: 0,
      errors: [],
    };

    try {
      let totalGasUsed = BigInt(0);
      let deployerNonce = await window.electronAPI.getNonce(
        chainConfig.rpc,
        chainConfig.sender.address
      );

      // Deploy each contract in sequence
      for (let i = 0; i < contracts.length; i++) {
        setCurrentStep(i);
        const contract = contracts[i];

        try {
          // Check if nonce matches expected
          const currentNonce = await window.electronAPI.getNonce(
            chainConfig.rpc,
            chainConfig.sender.address
          );

          if (currentNonce !== deployerNonce) {
            results.errors.push(
              `Nonce mismatch for ${contract.name}: expected ${deployerNonce}, got ${currentNonce}`
            );
            throw new Error(`Nonce mismatch for ${contract.name}`);
          }

          const deployment = await window.electronAPI.deployContract({
            contractName: contract.key,
            rpc: chainConfig.rpc,
            privateKey: chainConfig.sender.privateKey,
            nonce: deployerNonce,
            previousAddress: i > 0 ? results.contracts[contracts[i - 1].key as keyof typeof results.contracts]?.address : undefined,
          });

          if (deployment.success) {
            results.contracts[contract.key as keyof typeof results.contracts] = {
              name: contract.name,
              address: deployment.address,
              gasUsed: deployment.gasUsed,
              transactionHash: deployment.transactionHash,
              deploymentCost: deployment.cost,
              nonce: deployerNonce,
              status: 'success',
            };
            totalGasUsed += BigInt(deployment.gasUsed);
            deployerNonce++;
          } else {
            throw new Error(deployment.error || 'Deployment failed');
          }
        } catch (error: any) {
          results.errors.push(`Failed to deploy ${contract.name}: ${error.message}`);
          results.contracts[contract.key as keyof typeof results.contracts] = {
            name: contract.name,
            address: '',
            gasUsed: '0',
            transactionHash: '',
            deploymentCost: '0',
            nonce: deployerNonce,
            status: 'failed',
          };
          break;
        }
      }

      results.totalGasUsed = totalGasUsed.toString();
      const gasPrice = await window.electronAPI.getGasPrice(chainConfig.rpc);
      const totalCostWei = totalGasUsed * BigInt(gasPrice);
      // Safely convert BigInt to number by dividing in steps to avoid precision loss
      results.totalCostEth = (Number(totalCostWei / BigInt(1e9)) / 1e9).toFixed(6);
      results.deploymentTime = Date.now() - startTime;
      results.success = results.errors.length === 0;

      setDeploymentResults(results);
      onDeploymentComplete(results);
    } catch (error: any) {
      results.errors.push(`Deployment error: ${error.message}`);
      results.success = false;
      setDeploymentResults(results);
    } finally {
      setDeploying(false);
    }
  };

  const [estimate, setEstimate] = useState<any>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(true);

  useEffect(() => {
    calculateEstimate()
      .then(setEstimate)
      .finally(() => setLoadingEstimate(false));
  }, []);

  if (deploymentResults) {
    return (
      <Card className="bg-white border-gray-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
          <CardTitle className="text-gray-900 flex items-center gap-2">
            {deploymentResults.success ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                Deployment Successful
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6 text-red-600" />
                Deployment Failed
              </>
            )}
          </CardTitle>
          <CardDescription>Contract deployment completed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Total Gas Used</p>
              <p className="text-lg font-semibold text-gray-900">{deploymentResults.totalGasUsed}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Total Cost</p>
              <p className="text-lg font-semibold text-gray-900">
                {deploymentResults.totalCostEth} {chainConfig.nativeSymbol}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Deployed Contracts</h3>
            {Object.entries(deploymentResults.contracts).map(([key, contract]) => (
              <div
                key={key}
                className={`p-4 rounded-lg border-2 ${
                  contract?.status === 'success'
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <p className="font-semibold text-gray-900">{contract?.name}</p>
                    {contract?.address && (
                      <p className="text-sm text-gray-600 font-mono">{contract.address}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <span>Gas Used: {contract?.gasUsed}</span>
                      <span>Nonce: {contract?.nonce}</span>
                      <span className="col-span-2">
                        Cost: {contract?.deploymentCost} {chainConfig.nativeSymbol}
                      </span>
                    </div>
                  </div>
                  {contract?.status === 'success' ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {deploymentResults.errors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-900 mb-2">Errors</h3>
              <ul className="list-disc list-inside space-y-1">
                {deploymentResults.errors.map((error, idx) => (
                  <li key={idx} className="text-sm text-red-700">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button
            onClick={() => {
              // Generate and download report
              const report = generateDeploymentReport(deploymentResults, chainConfig);
              const blob = new Blob([report], { type: 'text/markdown' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `contract-deployment-report-${chainConfig.chainName}-${Date.now()}.md`;
              a.click();
              // Clean up to prevent memory leak
              URL.revokeObjectURL(url);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <FileText className="h-4 w-4 mr-2" />
            Download Deployment Report
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Loading state while calculating estimate
  if (showEstimate && loadingEstimate) {
    return (
      <Card className="bg-white border-gray-200 shadow-xl">
        <CardContent className="flex flex-col items-center justify-center h-64 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="text-gray-600">Calculating gas estimates...</p>
        </CardContent>
      </Card>
    );
  }

  if (showEstimate && estimate) {
    return (
      <Card className="bg-white border-gray-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            Deployment Cost Estimate
          </CardTitle>
          <CardDescription>
            Estimated gas costs for deploying BitGo MultiSig contracts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-4">Total Estimated Cost</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Gas</p>
                <p className="text-2xl font-bold text-gray-900">{estimate.totalGas.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900">
                  {estimate.totalCostEth} {chainConfig.nativeSymbol}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Contract Breakdown</h3>
            {estimate.breakdown.map((item: any) => (
              <div key={item.name} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {item.name.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {item.costEth} {chainConfig.nativeSymbol}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Gas: {item.gasEstimate.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> These are estimates. Actual gas costs may vary based on network
              conditions and contract complexity. Ensure your deployer account has sufficient balance.
            </p>
          </div>

          <Button
            onClick={deployContracts}
            disabled={deploying}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 py-6 text-lg"
          >
            {deploying ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Deploying Contracts...
              </>
            ) : (
              'Start Deployment'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-gray-200 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
        <CardTitle className="text-gray-900">Deploying Contracts</CardTitle>
        <CardDescription>
          Deploying {contracts[currentStep].name} ({currentStep + 1} of {contracts.length})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <Progress value={((currentStep + 1) / contracts.length) * 100} />

        <div className="space-y-3">
          {contracts.map((contract, idx) => (
            <div
              key={contract.key}
              className={`p-4 rounded-lg border-2 ${
                idx < currentStep
                  ? 'border-green-200 bg-green-50'
                  : idx === currentStep
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{contract.name}</p>
                  <p className="text-sm text-gray-600">Nonce: {contract.nonce}</p>
                </div>
                {idx < currentStep ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : idx === currentStep ? (
                  <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                ) : (
                  <div className="h-6 w-6 rounded-full border-2 border-gray-300" />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function generateDeploymentReport(results: DeploymentResults, config: EVMChainConfig): string {
  const timestamp = new Date().toISOString();

  return `# BitGo MultiSig Contract Deployment Report

**Chain:** ${config.chainName}
**Chain ID:** ${config.chainId}
**Deployment Date:** ${timestamp}
**Deployment Status:** ${results.success ? '✅ SUCCESS' : '❌ FAILED'}

---

## Summary

- **Total Gas Used:** ${results.totalGasUsed}
- **Total Cost:** ${results.totalCostEth} ${config.nativeSymbol}
- **Deployment Time:** ${(results.deploymentTime / 1000).toFixed(2)}s
- **RPC Endpoint:** ${config.rpc}

---

## Deployed Contracts

${Object.entries(results.contracts)
  .map(([_key, contract]) => {
    if (!contract) return '';
    return `### ${contract.name}
- **Status:** ${contract.status === 'success' ? '✅ Success' : '❌ Failed'}
- **Address:** \`${contract.address}\`
- **Transaction Hash:** \`${contract.transactionHash}\`
- **Gas Used:** ${contract.gasUsed}
- **Deployment Cost:** ${contract.deploymentCost} ${config.nativeSymbol}
- **Nonce:** ${contract.nonce}
`;
  })
  .join('\n')}

---

## Deployment Order & Dependencies

1. **WalletSimple** (Implementation)
   - No dependencies
   - Nonce: 0
   - Purpose: Base implementation for multi-sig wallets

2. **WalletFactory**
   - Depends on: WalletSimple address
   - Nonce: 1
   - Purpose: Factory for creating wallet clones

3. **ForwarderV4** (Implementation)
   - No dependencies
   - Nonce: 2
   - Purpose: Base implementation for forwarders

4. **ForwarderFactoryV4**
   - Depends on: ForwarderV4 address
   - Nonce: 3
   - Purpose: Factory for creating forwarder clones

---

## Nonce Management

✅ All deployments used sequential nonces starting from the deployer's current nonce.
✅ Nonce checks were performed before each deployment to ensure consistency.

---

## Gas Cost Analysis

| Contract | Gas Used | Cost (${config.nativeSymbol}) |
|----------|----------|------|
${Object.entries(results.contracts)
  .map(([_key, contract]) => {
    if (!contract) return '';
    return `| ${contract.name} | ${contract.gasUsed} | ${contract.deploymentCost} |`;
  })
  .join('\n')}
| **TOTAL** | **${results.totalGasUsed}** | **${results.totalCostEth}** |

---

## Errors

${results.errors.length > 0 ? results.errors.map(e => `- ${e}`).join('\n') : 'No errors occurred during deployment.'}

---

## Next Steps

${results.success ? `
1. **Verify Contracts:** Consider verifying contracts on block explorer
2. **Create Wallet:** Use WalletFactory.createWallet() with 3 signer addresses
3. **Create Forwarder:** Use ForwarderFactoryV4.createForwarder() with parent and fee addresses
4. **Test Functionality:** Run comprehensive tests on deployed contracts
` : `
1. **Review Errors:** Check the errors section above
2. **Verify Account Balance:** Ensure deployer has sufficient funds
3. **Check Network Status:** Verify RPC endpoint is accessible
4. **Retry Deployment:** Fix issues and attempt deployment again
`}

---

## Contract Repository

**GitHub:** https://github.com/BitGo/eth-multisig-v4
**Contracts Version:** v4
**License:** Apache-2.0

---

*Report generated by BitGo EVM Sandboxing Tool*
`;
}
