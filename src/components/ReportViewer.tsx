import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { CheckCircle2, XCircle, Activity, Network, FileDown } from 'lucide-react';

interface ReportViewerProps {
  results: any;
}

export function ReportViewer({ results }: ReportViewerProps) {
  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle2 className="h-5 w-5 text-green-600" />
    ) : (
      <XCircle className="h-5 w-5 text-red-600" />
    );
  };

  const formatKey = (key: string) => {
    const nameMap: Record<string, string> = {
      'legacyTransfer': 'Legacy Tx - EIP-155 (Type 0)',
      'tssTransfer': 'EIP-1559 Tx (Type 2)',
      'rpcTesting': 'RPC Methods Testing',
      'balance': 'Balance Check',
      'chainConfig': 'Chain Configuration'
    };
    return nameMap[key] || key.replace(/([A-Z])/g, ' $1').trim();
  };

  const handleExportPDF = async () => {
    try {
      await window.electronAPI.exportReport(results);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export PDF report. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card className="bg-white border-gray-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Activity className="h-6 w-6 text-blue-600" />
                Test Results Overview
              </CardTitle>
              <CardDescription className="text-gray-600">
                Comprehensive test execution report
              </CardDescription>
            </div>
            <Button
              onClick={handleExportPDF}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FileDown className="h-5 w-5 mr-2" />
              Export PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 shadow-md">
              <p className="text-sm text-blue-700 mb-1 font-medium">Total Tests</p>
              <p className="text-3xl font-bold text-blue-900">{Object.entries(results).filter(([key]) => key !== 'chainConfig').length}</p>
            </div>
            <div className="p-5 rounded-xl bg-green-50 border border-green-200 shadow-md">
              <p className="text-sm text-green-700 mb-1 font-medium">Passed</p>
              <p className="text-3xl font-bold text-green-700">
                {Object.entries(results).filter(([key, value]: [string, any]) => key !== 'chainConfig' && value.success).length}
              </p>
            </div>
            <div className="p-5 rounded-xl bg-red-50 border border-red-200 shadow-md">
              <p className="text-sm text-red-700 mb-1 font-medium">Failed</p>
              <p className="text-3xl font-bold text-red-700">
                {Object.entries(results).filter(([key, value]: [string, any]) => key !== 'chainConfig' && !value.success).length}
              </p>
            </div>
            <div className="p-5 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 shadow-md">
              <p className="text-sm text-purple-700 mb-1 font-medium">Success Rate</p>
              <p className="text-3xl font-bold text-purple-900">
                {(() => {
                  const testEntries = Object.entries(results).filter(([key]) => key !== 'chainConfig');
                  const passedTests = testEntries.filter(([, value]: [string, any]) => value.success).length;
                  return testEntries.length > 0 ? ((passedTests / testEntries.length) * 100).toFixed(0) : 0;
                })()}
                %
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(results).filter(([key]) => key !== 'chainConfig').map(([key, value]: [string, any]) => (
          <Card
            key={key}
            className={`bg-white border shadow-lg ${
              value.success ? 'border-green-200' : 'border-red-200'
            }`}
          >
            <CardHeader className={`border-b ${
              value.success ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                {getStatusIcon(value.success)}
                <span className="capitalize">{formatKey(key)}</span>
              </CardTitle>
              <CardDescription className="text-gray-600">
                {value.success ? 'Test passed successfully' : 'Test failed'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {/* Error Message */}
              {value.error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700 font-mono">{value.error}</p>
                </div>
              )}

              {/* Data Display */}
              {value.data && (
                <div className="space-y-3">
                  {/* Balance Data */}
                  {value.data.address && (
                    <div className="space-y-1 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 font-semibold">Address</p>
                      <p className="text-sm text-gray-900 font-mono truncate">{value.data.address}</p>
                    </div>
                  )}
                  {value.data.balance && (
                    <div className="space-y-1 p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-700 font-semibold">Balance</p>
                      <p className="text-sm text-green-700 font-mono font-bold">{value.data.balance} ETH</p>
                    </div>
                  )}

                  {/* Transfer Data - handles both txHash and transactionHash */}
                  {(value.data.txHash || value.data.transactionHash) && (
                    <div className="space-y-2 p-3 bg-blue-50 rounded-lg">
                       <div className="space-y-1">
                        <p className="text-xs text-blue-700 font-semibold">Transaction Hash</p>
                        <p className="text-sm text-blue-900 font-mono truncate">{value.data.txHash || value.data.transactionHash}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-blue-600">Block</p>
                          <p className="text-sm text-blue-900 font-semibold">{value.data.blockNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-blue-600">Gas Used</p>
                          <p className="text-sm text-blue-900 font-semibold">{value.data.gasUsed}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* RPC Testing Data */}
                  {value.data.summary && (
                    <div className="space-y-2 p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Network className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-semibold text-purple-900">RPC Methods</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 rounded-lg bg-white border border-purple-200">
                          <p className="text-xs text-purple-600">Total</p>
                          <p className="text-lg font-bold text-purple-900">{value.data.summary.total}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-green-100 border border-green-200">
                          <p className="text-xs text-green-700">Supported</p>
                          <p className="text-lg font-bold text-green-700">
                            {value.data.summary.supported}
                          </p>
                        </div>
                        <div className="p-2 rounded-lg bg-white border border-purple-200">
                          <p className="text-xs text-purple-600">Rate</p>
                          <p className="text-lg font-bold text-purple-900">
                            {value.data.summary.successRate}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Timestamp */}
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  {new Date(value.timestamp || Date.now()).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
