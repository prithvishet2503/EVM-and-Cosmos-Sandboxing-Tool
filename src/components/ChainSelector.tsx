import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Plus, Trash2 } from 'lucide-react';

import type { ChainType } from '../App';

interface ChainSelectorProps {
  chainType: ChainType;
  selectedChain: string | null;
  onSelectChain: (chain: string) => void;
}

export function ChainSelector({ chainType, selectedChain, onSelectChain }: ChainSelectorProps) {
  const [chains, setChains] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChains();
  }, []);

  const loadChains = async () => {
    try {
      const result = await window.electronAPI.listChainConfigs();
      if (result.success && result.data) {
        setChains(result.data);
      }
    } catch (error) {
      console.error('Failed to load chains:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (chain: string) => {
    if (confirm(`Delete configuration for ${chain}?`)) {
      await window.electronAPI.deleteChainConfig(chain);
      setChains(chains.filter((c) => c !== chain));
      if (selectedChain === chain) {
        onSelectChain('');
      }
    }
  };

  return (
    <Card className="bg-white border-gray-200 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
        <CardTitle className="text-gray-900">
          {chainType === 'cosmos' ? 'Cosmos' : 'EVM'} Chain Configurations
        </CardTitle>
        <CardDescription className="text-gray-600">
          Select or create a {chainType === 'cosmos' ? 'Cosmos' : 'EVM'} chain configuration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 pt-6">
        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : chains.length === 0 ? (
          <p className="text-gray-500 text-sm">No chains configured yet</p>
        ) : (
          chains.map((chain) => (
            <div
              key={chain}
              className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all ${
                selectedChain === chain
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md scale-105'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
              onClick={() => onSelectChain(chain)}
            >
              <span className="font-semibold capitalize">{chain}</span>
              <Button
                size="icon"
                variant="ghost"
                className={`h-8 w-8 ${
                  selectedChain === chain
                    ? 'text-white hover:bg-white/20'
                    : 'text-red-500 hover:text-red-600 hover:bg-red-50'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(chain);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
        <Button
          onClick={() => onSelectChain('new')}
          className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chain
        </Button>
      </CardContent>
    </Card>
  );
}
