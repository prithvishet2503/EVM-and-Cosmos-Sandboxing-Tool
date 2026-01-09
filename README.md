# BitGo Chain Sandbox

A desktop application for testing and validating EVM and Cosmos blockchain chains with a modern UI.

## Features

- **Chain Configuration Management**: Create, edit, and manage multiple blockchain chain configurations
- **Account Generation**: Automatically generate test accounts with Web3
- **Legacy Transfers**: Execute standard blockchain transfers
- **TSS Transfers**: Execute Threshold Signature Scheme (TSS) transfers using BitGo MPC
- **RPC Method Testing**: Comprehensive testing of RPC endpoints
- **Real-time Progress**: Live updates during test execution
- **Detailed Reporting**: Visual dashboards with test results and metrics

## Technology Stack

- **Electron**: Desktop application framework
- **Vite**: Fast build tool and dev server
- **React + TypeScript**: UI framework with type safety
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Beautiful, accessible UI components
- **Web3.js**: Ethereum JavaScript API
- **BitGo SDK**: MPC and TSS functionality

## Project Structure

```
bitgo-chain-sandbox/
├── electron/              # Electron main process
│   ├── main.ts           # Main process entry point
│   ├── preload.ts        # Preload script for IPC
│   └── ipc/              # IPC handlers
├── src/                  # React renderer process
│   ├── components/       # React components
│   │   ├── ui/          # shadcn/ui components
│   │   ├── ChainSelector.tsx
│   │   ├── ConfigForm.tsx
│   │   ├── TestRunner.tsx
│   │   └── ReportViewer.tsx
│   ├── lib/             # Utility functions
│   └── types/           # TypeScript types
├── core/                # Shared business logic
│   ├── blockchain/      # Web3 and blockchain operations
│   ├── account/         # Account management
│   ├── config/          # Chain configurations
│   └── types/           # Shared types
└── public/              # Static assets
```

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Package application
npm run package

# Platform-specific builds
npm run package:mac     # macOS
npm run package:win     # Windows
npm run package:linux   # Linux
```

## Usage

### 1. Configure a Chain

1. Click "New Chain" in the Chain Selector
2. Fill in chain details:
   - Chain Name (e.g., "ethereum", "polygon")
   - RPC URL
   - Chain ID
   - Network ID
3. Generate test accounts or provide your own
4. Save the configuration

### 2. Run Tests

1. Select a configured chain
2. Navigate to the "Test Chain" tab
3. Click "Start Tests" to execute:
   - Balance checks
   - Legacy transfers
   - TSS transfers (if fixtures are available)
   - RPC method compatibility testing

### 3. View Results

1. Navigate to the "Results" tab after tests complete
2. Review:
   - Test overview with pass/fail stats
   - Detailed results for each operation
   - Transaction hashes and block numbers
   - RPC method support matrix

## Configuration Files

### Chain Configuration
Stored in: `~/Library/Application Support/bitgo-chain-sandbox/configs/`

Example:
```json
{
  "chainName": "ethereum",
  "rpc": "https://mainnet.infura.io/v3/YOUR_KEY",
  "chainId": 1,
  "networkId": 1
}
```

### Account Configuration
Stored in: `~/Library/Application Support/bitgo-chain-sandbox/accounts/`

Example:
```json
{
  "sender": {
    "address": "0x...",
    "privateKey": "0x..."
  },
  "receiver": {
    "address": "0x...",
    "privateKey": "0x..."
  }
}
```

### TSS Fixtures
Located at: `core/config/fixtures.json`

Contains TSS key shares for MPC operations. Update this file with your own fixtures for TSS testing.

## Development

### Adding New Chain Support

1. Create a new config class extending `Config`:
```typescript
// core/config/chains/mychain.ts
import { Config } from '../base';

export class MyChainConfig extends Config {
  rpc = 'https://my-chain-rpc.com';
  chainId = 12345;
  networkId = 12345;
  chainName = 'mychain';
}
```

2. The UI will automatically detect and allow configuration of the new chain.

### Customizing Tests

Edit `electron/ipc/chainOperations.ts` to add or modify test operations:

```typescript
// Add new test
sendToRenderer('progress:update', {
  currentStep: 'My Custom Test',
  progress: 5,
  total: 7,
  status: 'running',
});

const myTestResult = await myCustomTest(chainConfig);
results.myTest = myTestResult;
```

## Troubleshooting

### Common Issues

**Issue**: App fails to start
- **Solution**: Run `npm install` to ensure all dependencies are installed

**Issue**: Tests fail with "Insufficient balance"
- **Solution**: Fund the sender account with native tokens

**Issue**: TSS transfers fail
- **Solution**: Verify `fixtures.json` contains valid TSS key shares

**Issue**: RPC methods fail
- **Solution**: Verify RPC URL is accessible and supports the methods

### Debug Mode

The app runs with DevTools open in development mode. Check the console for detailed error messages.

## Security Notes

- **Private Keys**: All private keys are stored locally on your machine
- **Never share** your `accounts/` directory or backup files
- The app does not transmit any data to external servers
- Review all transactions before execution on mainnet

## License

ISC

## Author

Prithvi Prakash Shet

## Support

For issues and feature requests, please check the application logs and configuration files.
