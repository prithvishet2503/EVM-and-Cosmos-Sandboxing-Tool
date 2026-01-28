import { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { ChainSelector } from './components/ChainSelector';
import { ConfigForm } from './components/ConfigForm';
import { AccountGeneration } from './components/AccountGeneration';
import { FundingInstructions } from './components/FundingInstructions';
import { TestRunner } from './components/TestRunner';
import { ReportViewer } from './components/ReportViewer';
import { ArrowLeft } from 'lucide-react';
import { Button } from './components/ui/button';

export interface ChainConfig {
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

type AppStage = 'landing' | 'configure' | 'generate-accounts' | 'funding' | 'testing' | 'results';

function App() {
  const [stage, setStage] = useState<AppStage>('landing');
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const [chainConfig, setChainConfig] = useState<Partial<ChainConfig> | null>(null);
  const [testResults, setTestResults] = useState<any>(null);

  const handleReset = () => {
    setStage('landing');
    setSelectedChain(null);
    setChainConfig(null);
    setTestResults(null);
  };

  if (stage === 'landing') {
    return <LandingPage onSelectType={() => setStage('configure')} />;
  }

  if (stage === 'generate-accounts' && chainConfig) {
    return (
      <AccountGeneration
        chainConfig={chainConfig}
        onAccountsGenerated={(accounts) => {
          setChainConfig({ ...chainConfig, ...accounts });
          setStage('funding');
        }}
      />
    );
  }

  if (stage === 'funding' && chainConfig && chainConfig.sender && chainConfig.secondAccount) {
    return (
      <FundingInstructions
        senderAddress={chainConfig.sender.address}
        secondAccountAddress={chainConfig.secondAccount.address}
        rpcUrl={chainConfig.rpc!}
        chainName={chainConfig.chainName!}
        nativeSymbol={chainConfig.nativeSymbol!}
        onContinue={() => setStage('testing')}
      />
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
                EVM Sandboxing
              </h1>
            </div>
            <p className="text-gray-600">
              Configure and test your EVM blockchain integration
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
                selectedChain={selectedChain}
                onSelectChain={setSelectedChain}
              />
            </div>
            <div className="lg:col-span-2">
              <ConfigForm
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
