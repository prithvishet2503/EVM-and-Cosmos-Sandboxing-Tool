import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Copy, CheckCircle2, Wallet, ArrowRight, RefreshCw } from 'lucide-react';

interface FundingInstructionsProps {
  senderAddress: string;
  rpcUrl: string;
  chainName: string;
  nativeSymbol: string;
  onContinue: () => void;
}

export function FundingInstructions({
  senderAddress,
  rpcUrl,
  chainName,
  nativeSymbol,
  onContinue,
}: FundingInstructionsProps) {
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState<string>('0');
  const [checking, setChecking] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(senderAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const checkBalance = async () => {
    setChecking(true);
    try {
      const Web3 = (await import('web3')).default;
      const w3 = new Web3(rpcUrl);
      const balanceWei = await w3.eth.getBalance(senderAddress);
      const balanceEth = w3.utils.fromWei(balanceWei, 'ether');
      setBalance(balanceEth);
    } catch (error) {
      console.error('Failed to check balance:', error);
      setBalance('0');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkBalance();
    // Set up interval to check balance every 10 seconds
    const interval = setInterval(checkBalance, 10000);
    return () => clearInterval(interval);
  }, [senderAddress, rpcUrl]);

  const hasFunds = parseFloat(balance) > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
            <Wallet className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Fund Your Test Account
          </h1>
          <p className="text-lg text-gray-600">
            Add funds to your account to start testing on {chainName}
          </p>
        </div>

        {/* Main Card */}
        <Card className="bg-white border-gray-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
            <CardTitle className="text-gray-900">Account Details</CardTitle>
            <CardDescription className="text-gray-600">
              Copy the address below and send some test tokens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Address Display */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Sender Address
              </label>
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-sm break-all text-gray-800">
                  {senderAddress}
                </div>
                <Button
                  onClick={copyAddress}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 shrink-0"
                >
                  {copied ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Balance Display */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700">
                  Current Balance
                </label>
                <Button
                  onClick={checkBalance}
                  disabled={checking}
                  size="sm"
                  variant="outline"
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              <div
                className={`bg-gradient-to-r ${
                  hasFunds
                    ? 'from-green-50 to-green-100 border-green-200'
                    : 'from-gray-50 to-gray-100 border-gray-200'
                } border rounded-lg p-6 text-center`}
              >
                <div className="text-4xl font-bold text-gray-900 mb-1">
                  {balance} {nativeSymbol}
                </div>
                {hasFunds ? (
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Account Funded</span>
                  </div>
                ) : (
                  <div className="text-gray-600">Waiting for funds...</div>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">How to fund:</h3>
              <ol className="space-y-2 text-sm text-blue-800 list-decimal list-inside">
                <li>Copy the sender address above</li>
                <li>Send at least <span className="font-bold text-blue-900">5 {nativeSymbol}</span> from a faucet or your wallet</li>
                <li>Wait for the transaction to confirm</li>
                <li>Click refresh to check your balance</li>
                <li>Proceed to testing once you have funds</li>
              </ol>
            </div>

            {/* Continue Button */}
            <Button
              onClick={onContinue}
              disabled={!hasFunds}
              size="lg"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <span>Continue to Testing</span>
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
