import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Save, Sparkles } from 'lucide-react';
import type { ChainConfig } from '../App';

interface ConfigFormProps {
  selectedChain: string | null;
  onConfigSaved: (config: Partial<ChainConfig>) => void;
}

export function ConfigForm({ selectedChain, onConfigSaved }: ConfigFormProps) {
  const [config, setConfig] = useState<Partial<ChainConfig>>({
    chainName: '',
    rpc: '',
    chainId: 0,
    networkId: 0,
    nativeSymbol: '',
    jiraTicket: '',
    sender: { address: '', privateKey: '' },
    receiver: { address: '', privateKey: '' },
    secondAccount: { address: '', privateKey: '' },
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedChain && selectedChain !== 'new') {
      loadConfig(selectedChain);
    } else if (selectedChain === 'new') {
      resetConfig();
    }
  }, [selectedChain]);

  const loadConfig = async (chainName: string) => {
    setLoading(true);
    try {
      const result = await window.electronAPI.loadChainConfig(chainName);
      if (result.success) {
        setConfig(result.data);
      }
      // Try to load accounts
      const accountsResult = await window.electronAPI.loadAccounts(chainName);
      if (accountsResult.success) {
        setConfig((prev) => ({
          ...prev,
          ...accountsResult.data,
        }));
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetConfig = () => {
    setConfig({
      chainName: '',
      rpc: '',
      chainId: 0,
      networkId: 0,
      nativeSymbol: '',
      jiraTicket: '',
      sender: { address: '', privateKey: '' },
      receiver: { address: '', privateKey: '' },
      secondAccount: { address: '', privateKey: '' },
    });
  };

  const handleSave = async () => {
    if (!config.chainName || !config.rpc || !config.chainId || !config.nativeSymbol) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Save basic chain configuration
      await window.electronAPI.saveChainConfig(config.chainName, config);
      onConfigSaved(config);
    } catch (error) {
      console.error('Failed to save config:', error);
      alert('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedChain) {
    return (
      <Card className="bg-white border-gray-200 shadow-lg">
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-gray-500">Select or create a chain configuration</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-gray-200 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
        <CardTitle className="text-gray-900 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" />
          Chain Configuration
        </CardTitle>
        <CardDescription className="text-gray-600">
          Configure chain details and accounts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chain Details */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="chainName" className="text-gray-700 font-semibold">
                Chain Name
              </Label>
              <Input
                id="chainName"
                value={config.chainName}
                onChange={(e) => setConfig({ ...config, chainName: e.target.value })}
                className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                placeholder="e.g., ethereum, polygon"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rpc" className="text-gray-700 font-semibold">
                RPC URL
              </Label>
              <Input
                id="rpc"
                value={config.rpc}
                onChange={(e) => setConfig({ ...config, rpc: e.target.value })}
                className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="chainId" className="text-gray-700 font-semibold">
                Chain ID
              </Label>
              <Input
                id="chainId"
                type="number"
                value={config.chainId}
                onChange={(e) => {
                  const id = parseInt(e.target.value);
                  setConfig({ ...config, chainId: id, networkId: id });
                }}
                className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                placeholder="e.g., 1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nativeSymbol" className="text-gray-700 font-semibold">
                Native Symbol
              </Label>
              <Input
                id="nativeSymbol"
                value={config.nativeSymbol}
                onChange={(e) => setConfig({ ...config, nativeSymbol: e.target.value.toUpperCase() })}
                className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                placeholder="e.g., ETH, MATIC"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jiraTicket" className="text-gray-700 font-semibold">
              JIRA Ticket 
            </Label>
            <Input
              id="jiraTicket"
              value={config.jiraTicket || ''}
              onChange={(e) => setConfig({ ...config, jiraTicket: e.target.value })}
              className="bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
              placeholder="e.g., https://jira.company.com/browse/WIN-4720"
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          <Save className="h-5 w-5 mr-2" />
          {loading ? 'Saving...' : 'Continue to Account Generation'}
        </Button>
      </CardContent>
    </Card>
  );
}
