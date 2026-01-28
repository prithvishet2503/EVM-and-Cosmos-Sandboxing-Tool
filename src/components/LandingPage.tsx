import { ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import bitgoLogo from '../assets/bitgo.png';

interface LandingPageProps {
  onSelectType: (type: 'evm' | 'cosmos') => void;
}

export function LandingPage({ onSelectType }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      {/* BitGo Logo */}
      <div className="mb-12 text-center">
        <div className="mb-8 flex justify-center">
          <img
            src={bitgoLogo}
            alt="BitGo Logo"
            className="h-20 drop-shadow-lg"
          />
        </div>

        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Blockchain Sandboxing
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Test and validate your blockchain integrations with EVM and Cosmos networks
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-6 mt-8">
        <Button
          onClick={() => onSelectType('evm')}
          size="lg"
          className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-12 py-8 text-xl font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
        >
          <div className="flex items-center gap-3">
            <span>EVM Sandboxing</span>
            <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
          </div>
        </Button>

        <Button
          onClick={() => onSelectType('cosmos')}
          size="lg"
          className="group relative overflow-hidden bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white px-12 py-8 text-xl font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
        >
          <div className="flex items-center gap-3">
            <span>Cosmos Sandboxing</span>
            <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
          </div>
        </Button>
      </div>

      {/* Footer */}
      <div className="mt-20 text-center text-gray-500 text-sm">
        <p>Comprehensive testing for blockchain integrations</p>
      </div>
    </div>
  );
}
