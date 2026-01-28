import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { RefreshCw, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import type { ChainConfig, ChainType } from '../App';

interface AccountGenerationProps {
  chainConfig: Partial<ChainConfig>;
  chainType: ChainType;
  onAccountsGenerated: (accounts: any) => void;
}

export function AccountGeneration({ chainConfig, chainType, onAccountsGenerated }: AccountGenerationProps) {
  const [accounts, setAccounts] = useState<any>(
    chainType === 'evm'
      ? {
          sender: { address: '', privateKey: '' },
          receiver: { address: '', privateKey: '' },
          secondAccount: { address: '', privateKey: '' },
        }
      : {
          sender: { address: '', mnemonic: '' },
          receiver: { address: '', mnemonic: '' },
          secondAccount: { address: '', mnemonic: '' },
        }
  );
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generateAccounts = async () => {
    if (!chainConfig.rpc) {
      alert('RPC URL is missing');
      return;
    }

    setGenerating(true);
    try {
      if (chainType === 'evm') {
        const result = await window.electronAPI.generateAccount(chainConfig.rpc);
        if (result.success) {
          setAccounts(result.data);
          setGenerated(true);
        } else {
          alert('Failed to generate accounts');
        }
      } else {
        // Generate Cosmos accounts (mnemonics)
        const result = await window.electronAPI.generateCosmosAccount(
          (chainConfig as any).addressPrefix || 'cosmos'
        );
        if (result.success) {
          setAccounts(result.data);
          setGenerated(true);
        } else {
          alert('Failed to generate Cosmos accounts');
        }
      }
    } catch (error) {
      console.error('Failed to generate accounts:', error);
      alert('Failed to generate accounts');
    } finally {
      setGenerating(false);
    }
  };

  const handleContinue = async () => {
    if (!generated) {
      alert('Please generate accounts first');
      return;
    }

    try {
      // Save accounts
      await window.electronAPI.saveAccounts(chainConfig.chainName!, accounts);
      onAccountsGenerated(accounts);
    } catch (error) {
      console.error('Failed to save accounts:', error);
      alert('Failed to save accounts');
    }
  };

  const hasAccounts = accounts.sender.address && accounts.receiver.address;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
            <Sparkles className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Generate Test Accounts
          </h1>
          <p className="text-lg text-gray-600">
            Create wallet accounts for testing on {chainConfig.chainName}
          </p>
        </div>

        {/* Main Card */}
        <Card className="bg-white border-gray-200 shadow-xl mb-6">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              {chainType === 'cosmos' ? 'Cosmos' : 'EVM'} Account Generation
            </CardTitle>
            <CardDescription className="text-gray-600">
              Generate secure {chainType === 'cosmos' ? 'mnemonic-based' : 'private key-based'} wallet
              accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Generate Button */}
            {!generated && (
              <div className="text-center p-8">
                <p className="text-gray-600 mb-6">
                  Click the button below to automatically generate three test accounts
                </p>
                <Button
                  onClick={generateAccounts}
                  disabled={generating}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-12 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  <RefreshCw className={`h-6 w-6 mr-3 ${generating ? 'animate-spin' : ''}`} />
                  {generating ? 'Generating Accounts...' : 'Generate Accounts'}
                </Button>
              </div>
            )}

            {/* Generated Accounts Display */}
            {generated && (
              <div className="space-y-4">
                {/* Success Message */}
                <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="text-green-700 font-medium">Accounts generated successfully!</p>
                </div>

                {/* Sender Account */}
                <div className="space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Label className="text-gray-900 font-semibold flex items-center gap-2">
                    <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                      1
                    </span>
                    Sender Account
                  </Label>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Address</p>
                      <Input
                        value={accounts.sender.address}
                        readOnly
                        className="bg-white border-gray-300 text-gray-900 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">
                        {chainType === 'cosmos' ? 'Mnemonic Phrase' : 'Private Key'}
                      </p>
                      {chainType === 'cosmos' ? (
                        <Textarea
                          value={accounts.sender.mnemonic}
                          readOnly
                          className="bg-white border-gray-300 text-gray-900 text-sm font-mono min-h-[80px]"
                        />
                      ) : (
                        <Input
                          type="password"
                          value={accounts.sender.privateKey}
                          readOnly
                          className="bg-white border-gray-300 text-gray-900 text-sm font-mono"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Receiver Account */}
                <div className="space-y-2 p-4 bg-green-50 rounded-lg border border-green-200">
                  <Label className="text-gray-900 font-semibold flex items-center gap-2">
                    <span className="bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                      2
                    </span>
                    Receiver Account
                  </Label>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Address</p>
                      <Input
                        value={accounts.receiver.address}
                        readOnly
                        className="bg-white border-gray-300 text-gray-900 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">
                        {chainType === 'cosmos' ? 'Mnemonic Phrase' : 'Private Key'}
                      </p>
                      {chainType === 'cosmos' ? (
                        <Textarea
                          value={accounts.receiver.mnemonic}
                          readOnly
                          className="bg-white border-gray-300 text-gray-900 text-sm font-mono min-h-[80px]"
                        />
                      ) : (
                        <Input
                          type="password"
                          value={accounts.receiver.privateKey}
                          readOnly
                          className="bg-white border-gray-300 text-gray-900 text-sm font-mono"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Second Account (for TSS) */}
                <div className="space-y-2 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <Label className="text-gray-900 font-semibold flex items-center gap-2">
                    <span className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                      3
                    </span>
                    Second Account (TSS)
                  </Label>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Address</p>
                      <Input
                        value={accounts.secondAccount.address}
                        readOnly
                        className="bg-white border-gray-300 text-gray-900 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">
                        {chainType === 'cosmos' ? 'Mnemonic Phrase' : 'Private Key'}
                      </p>
                      {chainType === 'cosmos' ? (
                        <Textarea
                          value={accounts.secondAccount.mnemonic}
                          readOnly
                          className="bg-white border-gray-300 text-gray-900 text-sm font-mono min-h-[80px]"
                        />
                      ) : (
                        <Input
                          type="password"
                          value={accounts.secondAccount.privateKey}
                          readOnly
                          className="bg-white border-gray-300 text-gray-900 text-sm font-mono"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Important:</h3>
                  <ul className="space-y-1 text-sm text-blue-800 list-disc list-inside">
                    <li>These accounts have been generated locally and securely</li>
                    <li>
                      {chainType === 'cosmos'
                        ? 'Mnemonics use BIP39 standard with 24 words'
                        : 'Private keys are 256-bit secp256k1 keys'}
                    </li>
                    <li>The sender and second accounts will need to be funded for testing</li>
                    <li>
                      {chainType === 'cosmos' ? 'Mnemonics' : 'Private keys'} are stored locally and
                      encrypted
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Continue Button */}
            {generated && (
              <Button
                onClick={handleContinue}
                disabled={!hasAccounts}
                size="lg"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                <span>Continue to Funding</span>
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
