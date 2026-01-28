import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Copy, CheckCircle2, Wallet, ArrowRight, RefreshCw } from 'lucide-react';
import type { ChainType } from '../App';

interface FundingInstructionsProps {
  chainType: ChainType;
  senderAddress: string;
  secondAccountAddress: string;
  rpcUrl: string;
  chainName: string;
  nativeSymbol: string;
  onContinue: () => void;
}

export function FundingInstructions({
  chainType,
  senderAddress,
  secondAccountAddress,
  rpcUrl,
  chainName,
  nativeSymbol,
  onContinue,
}: FundingInstructionsProps) {
  const [copiedSender, setCopiedSender] = useState(false);
  const [copiedSecond, setCopiedSecond] = useState(false);
  const [senderBalance, setSenderBalance] = useState<string>('0');
  const [secondBalance, setSecondBalance] = useState<string>('0');
  const [checking, setChecking] = useState(false);

  const copyAddress = (address: string, isSender: boolean) => {
    navigator.clipboard.writeText(address);
    if (isSender) {
      setCopiedSender(true);
      setTimeout(() => setCopiedSender(false), 2000);
    } else {
      setCopiedSecond(true);
      setTimeout(() => setCopiedSecond(false), 2000);
    }
  };

  const checkBalance = async () => {
    setChecking(true);
    try {
      if (chainType === 'evm') {
        const Web3 = (await import('web3')).default;
        const w3 = new Web3(rpcUrl);

        // Check sender balance
        const senderBalanceWei = await w3.eth.getBalance(senderAddress);
        const senderBalanceEth = w3.utils.fromWei(senderBalanceWei, 'ether');
        setSenderBalance(senderBalanceEth);

        // Check second account balance
        const secondBalanceWei = await w3.eth.getBalance(secondAccountAddress);
        const secondBalanceEth = w3.utils.fromWei(secondBalanceWei, 'ether');
        setSecondBalance(secondBalanceEth);
      } else {
        // Cosmos balance checking
        const { StargateClient } = await import('@cosmjs/stargate');
        const client = await StargateClient.connect(rpcUrl);

        // Check sender balance
        const senderCoins = await client.getAllBalances(senderAddress);
        const senderCoin = senderCoins.find((c) => c.denom === nativeSymbol);
        setSenderBalance(senderCoin ? (parseInt(senderCoin.amount) / 1_000_000).toFixed(6) : '0');

        // Check second account balance
        const secondCoins = await client.getAllBalances(secondAccountAddress);
        const secondCoin = secondCoins.find((c) => c.denom === nativeSymbol);
        setSecondBalance(secondCoin ? (parseInt(secondCoin.amount) / 1_000_000).toFixed(6) : '0');

        client.disconnect();
      }

    } catch (error) {
      console.error('Failed to check balance:', error);
      setSenderBalance('0');
      setSecondBalance('0');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkBalance();
    // Set up interval to check balance every 10 seconds
    const interval = setInterval(checkBalance, 10000);
    return () => clearInterval(interval);
  }, [senderAddress, secondAccountAddress, rpcUrl, chainType]);

  const senderHasFunds = parseFloat(senderBalance) > 0;
  const secondHasFunds = parseFloat(secondBalance) > 0;
  const bothFunded = senderHasFunds && secondHasFunds;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
            <Wallet className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Fund Your Test Accounts
          </h1>
          <p className="text-lg text-gray-600">
            Add funds to both accounts (for TSS wallet testing) on {chainName}
          </p>
        </div>

        {/* Main Card */}
        <Card className="bg-white border-gray-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
            <CardTitle className="text-gray-900">Account Details</CardTitle>
            <CardDescription className="text-gray-600">
              Fund both accounts below for TSS wallet testing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Sender Address */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Sender Address (Account 1)
              </label>
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-sm break-all text-gray-800">
                  {senderAddress}
                </div>
                <Button
                  onClick={() => copyAddress(senderAddress, true)}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 shrink-0"
                >
                  {copiedSender ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </Button>
              </div>
              <div
                className={`bg-gradient-to-r ${
                  senderHasFunds
                    ? 'from-green-50 to-green-100 border-green-200'
                    : 'from-gray-50 to-gray-100 border-gray-200'
                } border rounded-lg p-4 text-center`}
              >
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {senderBalance} {nativeSymbol}
                </div>
                {senderHasFunds ? (
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium text-sm">Funded</span>
                  </div>
                ) : (
                  <div className="text-gray-600 text-sm">Waiting for funds...</div>
                )}
              </div>
            </div>

            {/* Second Account Address */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                TSS Wallet Address (Account 2)
              </label>
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-sm break-all text-gray-800">
                  {secondAccountAddress}
                </div>
                <Button
                  onClick={() => copyAddress(secondAccountAddress, false)}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 shrink-0"
                >
                  {copiedSecond ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </Button>
              </div>
              <div
                className={`bg-gradient-to-r ${
                  secondHasFunds
                    ? 'from-green-50 to-green-100 border-green-200'
                    : 'from-gray-50 to-gray-100 border-gray-200'
                } border rounded-lg p-4 text-center`}
              >
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {secondBalance} {nativeSymbol}
                </div>
                {secondHasFunds ? (
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium text-sm">Funded</span>
                  </div>
                ) : (
                  <div className="text-gray-600 text-sm">Waiting for funds...</div>
                )}
              </div>
            </div>

            {/* Refresh Button */}
            <div className="flex justify-center">
              <Button
                onClick={checkBalance}
                disabled={checking}
                size="sm"
                variant="outline"
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
                Refresh Balances
              </Button>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">How to fund both accounts:</h3>
              <ol className="space-y-2 text-sm text-blue-800 list-decimal list-inside">
                <li>Copy <span className="font-bold">both addresses</span> above (Account 1 and Account 2)</li>
                <li>
                  Send at least <span className="font-bold text-blue-900">
                    {chainType === 'cosmos' ? '1000000 ' : '5 '}
                    {chainType === 'cosmos' ? nativeSymbol : nativeSymbol}
                  </span> to <span className="font-bold">each address</span> from a {chainType === 'cosmos' ? 'faucet' : 'faucet or your wallet'}
                </li>
                <li>Wait for both transactions to confirm</li>
                <li>Click "Refresh Balances" to check both balances</li>
                <li>Proceed to testing once <span className="font-bold">both accounts</span> are funded</li>
              </ol>
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                <strong>Note:</strong> Both accounts must be funded for {chainType === 'cosmos' ? 'TSS signing' : 'TSS wallet'} testing to work properly.
                {chainType === 'cosmos' && ' (Base denomination like uatom, uosmo, etc.)'}
              </div>
            </div>

            {/* Continue Button */}
            <Button
              onClick={onContinue}
              disabled={!bothFunded}
              size="lg"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>
                {bothFunded ? 'Continue to Testing' : 'Fund Both Accounts to Continue'}
              </span>
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
