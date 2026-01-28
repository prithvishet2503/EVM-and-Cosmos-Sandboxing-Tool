import { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { ChainSelector } from './components/ChainSelector';
import { ConfigForm } from './components/ConfigForm';
import { AccountGeneration } from './components/AccountGeneration';
import { FundingInstructions } from './components/FundingInstructions';
import { ContractDeployment } from './components/ContractDeployment';
import { TestRunner } from './components/TestRunner';
import { ReportViewer } from './components/ReportViewer';
import { ArrowLeft } from 'lucide-react';
import { Button } from './components/ui/button';

export type ChainType = 'evm' | 'cosmos';

export interface EVMChainConfig {
  chainType: 'evm';
  rpc: string;
  chainId: number;
  networkId: number;
  chainName: string;
  nativeSymbol: string;
  jiraTicket?: string;
  sender: { address: string; privateKey: string };
  receiver: { address: string; privateKey: string };
  secondAccount: { address: string; privateKey: string };
}

export interface CosmosChainConfig {
  chainType: 'cosmos';
  rpc: string;
  chainId: string;
  chainName: string;
  denom: string;
  addressPrefix: string;
  jiraTicket?: string;
  sender: { address: string; mnemonic: string };
  receiver: { address: string; mnemonic: string };
  secondAccount: { address: string; mnemonic: string };
}

export type ChainConfig = EVMChainConfig | CosmosChainConfig;

type AppStage = 'landing' | 'chain-type' | 'configure' | 'generate-accounts' | 'funding' | 'contract-deployment' | 'testing' | 'results';

function App() {
  const [stage, setStage] = useState<AppStage>('landing');
  const [chainType, setChainType] = useState<ChainType | null>(null);
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const [chainConfig, setChainConfig] = useState<Partial<ChainConfig> | null>(null);
  const [testResults, setTestResults] = useState<any>(null);

  const handleReset = () => {
    setStage('landing');
    setChainType(null);
    setSelectedChain(null);
    setChainConfig(null);
    setTestResults(null);
  };

  if (stage === 'landing') {
    return <LandingPage onSelectType={(type) => {
      setChainType(type);
      setStage('configure');
    }} />;
  }

  if (stage === 'chain-type') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Your Chain Type
            </h1>
            <p className="text-lg text-gray-600">
              Select the blockchain type you want to test
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div
              onClick={() => {
                setChainType('evm');
                setStage('configure');
              }}
              className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all cursor-pointer border-2 border-transparent hover:border-blue-500"
            >
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">⟠</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">EVM Chains</h2>
                <p className="text-gray-600 mb-4">
                  Ethereum, Polygon, Arbitrum, Base, and other EVM-compatible chains
                </p>
                <ul className="text-left text-sm text-gray-500 space-y-2">
                  <li>• Private key authentication</li>
                  <li>• Type 0 & Type 2 transactions</li>
                  <li>• TSS wallet support</li>
                  <li>• RPC method testing</li>
                </ul>
              </div>
            </div>
            <div
              onClick={() => {
                setChainType('cosmos');
                setStage('configure');
              }}
              className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all cursor-pointer border-2 border-transparent hover:border-purple-500"
            >
              <div className="text-center">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">⚛</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Cosmos Chains</h2>
                <p className="text-gray-600 mb-4">
                  Cosmos Hub, Osmosis, Celestia, Sei, and other Cosmos SDK chains
                </p>
                <ul className="text-left text-sm text-gray-500 space-y-2">
                  <li>• Mnemonic-based authentication</li>
                  <li>• Protobuf transactions</li>
                  <li>• TSS signing support</li>
                  <li>• CosmJS integration</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-8 text-center">
            <Button
              onClick={handleReset}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'generate-accounts' && chainConfig && chainType) {
    return (
      <AccountGeneration
        chainConfig={chainConfig}
        chainType={chainType}
        onAccountsGenerated={(accounts) => {
          setChainConfig({ ...chainConfig, ...accounts });
          setStage('funding');
        }}
      />
    );
  }

  if (stage === 'funding' && chainConfig && chainConfig.sender && chainConfig.secondAccount && chainType) {
    const nativeSymbol = chainConfig.chainType === 'evm'
      ? (chainConfig as EVMChainConfig).nativeSymbol
      : (chainConfig as CosmosChainConfig).denom;
    return (
      <FundingInstructions
        chainType={chainType}
        senderAddress={chainConfig.sender.address}
        secondAccountAddress={chainConfig.secondAccount.address}
        rpcUrl={chainConfig.rpc!}
        chainName={chainConfig.chainName!}
        nativeSymbol={nativeSymbol!}
        onContinue={() => {
          // Only show contract deployment for EVM chains
          if (chainType === 'evm') {
            setStage('contract-deployment');
          } else {
            setStage('testing');
          }
        }}
      />
    );
  }

  if (stage === 'contract-deployment' && chainConfig && chainConfig.chainType === 'evm' && chainConfig.sender) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={handleReset}
            variant="outline"
            className="mb-4 border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <ContractDeployment
            chainConfig={chainConfig as EVMChainConfig}
            onDeploymentComplete={() => {
              setStage('testing');
            }}
          />
          <Button
            onClick={() => setStage('testing')}
            variant="outline"
            className="mt-4 w-full border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Skip Contract Deployment & Continue to Testing
          </Button>
        </div>
      </div>
    );
  }

  if (stage === 'testing' && chainConfig && chainConfig.sender) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
        <div className="max-w-6xl mx-auto">
          <Button
            onClick={handleReset}
            variant="outline"
            className="mb-4 border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <TestRunner
            chainConfig={chainConfig as ChainConfig}
            onTestComplete={(results) => {
              setTestResults(results);
              setStage('results');
            }}
          />
        </div>
      </div>
    );
  }

  if (stage === 'results' && testResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
        <div className="max-w-6xl mx-auto">
          <Button
            onClick={handleReset}
            variant="outline"
            className="mb-4 border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <ReportViewer results={testResults} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="6" width="24" height="24" rx="4" fill="#0066FF" />
                <rect x="8" y="12" width="12" height="12" rx="2" fill="white" />
              </svg>
              <h1 className="text-4xl font-bold text-gray-900">
                {chainType === 'cosmos' ? 'Cosmos' : 'EVM'} Sandboxing
              </h1>
            </div>
            <p className="text-gray-600">
              Configure and test your {chainType === 'cosmos' ? 'Cosmos' : 'EVM'} blockchain integration
            </p>
          </div>
          <Button
            onClick={handleReset}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <ChainSelector
                chainType={chainType!}
                selectedChain={selectedChain}
                onSelectChain={setSelectedChain}
              />
            </div>
            <div className="lg:col-span-2">
              <ConfigForm
                chainType={chainType!}
                selectedChain={selectedChain}
                onConfigSaved={(config) => {
                  setChainConfig(config);
                  setStage('generate-accounts');
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
