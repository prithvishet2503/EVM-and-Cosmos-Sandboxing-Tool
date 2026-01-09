import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Play, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { ChainConfig } from '../App';

interface TestRunnerProps {
  chainConfig: ChainConfig;
  onTestComplete: (results: any) => void;
}

interface ProgressUpdate {
  currentStep: string;
  progress: number;
  total: number;
  status: 'pending' | 'running' | 'completed' | 'error';
  message?: string;
}

export function TestRunner({ chainConfig, onTestComplete }: TestRunnerProps) {
  const [testing, setTesting] = useState(false);
  const [progress, setProgress] = useState<ProgressUpdate>({
    currentStep: 'Not started',
    progress: 0,
    total: 6,
    status: 'pending',
  });
  const [results, setResults] = useState<any>(null);

  const formatTestName = (key: string): string => {
    const nameMap: Record<string, string> = {
      'legacyTransfer': 'Legacy Tx - EIP-155 (Type 0)',
      'tssTransfer': 'EIP-1559 Tx (Type 2)',
      'rpcTesting': 'RPC Methods Testing',
      'balance': 'Balance Check',
      'chainConfig': 'Chain Configuration'
    };
    return nameMap[key] || key.replace(/([A-Z])/g, ' $1').trim();
  };

  useEffect(() => {
    // Listen for progress updates
    const unsubscribe = window.electronAPI.onProgressUpdate((data: ProgressUpdate) => {
      setProgress(data);
    });

    // Listen for test completion
    const unsubscribeComplete = window.electronAPI.onTestComplete((data: any) => {
      setResults(data);
      setTesting(false);
      onTestComplete(data);
    });

    return () => {
      unsubscribe();
      unsubscribeComplete();
    };
  }, [onTestComplete]);

  const startTest = async () => {
    setTesting(true);
    setProgress({
      currentStep: 'Starting tests...',
      progress: 0,
      total: 6,
      status: 'running',
    });
    setResults(null);

    try {
      await window.electronAPI.testChain(chainConfig);
    } catch (error) {
      console.error('Test failed:', error);
      setProgress({
        ...progress,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      setTesting(false);
    }
  };

  const progressPercentage = (progress.progress / progress.total) * 100;

  return (
    <div className="space-y-6">
      <Card className="bg-white border-gray-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
          <CardTitle className="text-gray-900">Test Execution</CardTitle>
          <CardDescription className="text-gray-600">
            Run comprehensive tests for {chainConfig.chainName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Test Controls */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-gray-700 font-semibold">Chain: {chainConfig.chainName}</p>
              <p className="text-sm text-gray-500 truncate max-w-md">{chainConfig.rpc}</p>
            </div>
            <Button
              onClick={startTest}
              disabled={testing}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg"
            >
              {testing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Start Tests
                </>
              )}
            </Button>
          </div>

          {/* Progress Section */}
          {(testing || progress.status !== 'pending') && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-medium">{progress.currentStep}</span>
                  <span className="text-gray-600">
                    {progress.progress} / {progress.total}
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-3" />
              </div>

              {/* Status Message */}
              {progress.message && (
                <div
                  className={`p-4 rounded-lg border ${
                    progress.status === 'error'
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-blue-50 border-blue-200 text-blue-700'
                  }`}
                >
                  <p className="text-sm font-medium">{progress.message}</p>
                </div>
              )}
            </div>
          )}

          {/* Quick Results Summary */}
          {results && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(results).filter(([key]) => key !== 'chainConfig').map(([key, value]: [string, any]) => (
                <div
                  key={key}
                  className={`p-5 rounded-xl border shadow-md ${
                    value.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {value.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <h4 className="font-semibold text-gray-900">
                      {formatTestName(key)}
                    </h4>
                  </div>
                  <p className={`text-sm font-medium ${value.success ? 'text-green-700' : 'text-red-700'}`}>
                    {value.success ? 'Passed' : 'Failed'}
                  </p>
                  {value.error && (
                    <p className="text-xs text-gray-600 mt-1 truncate">{value.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
