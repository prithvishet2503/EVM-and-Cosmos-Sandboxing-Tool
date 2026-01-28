#!/usr/bin/env node

/**
 * Fetch contract bytecodes directly from BitGo GitHub repository
 * This is faster than cloning and compiling locally!
 *
 * Usage: node fetchBytecodesFromGithub.js
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/BitGo/eth-multisig-v4/master/artifacts/contracts';

const CONTRACTS = [
  {
    name: 'WalletSimple',
    path: 'WalletSimple.sol/WalletSimple.json',
    constantName: 'WALLET_SIMPLE_BYTECODE'
  },
  {
    name: 'WalletFactory',
    path: 'WalletFactory.sol/WalletFactory.json',
    constantName: 'WALLET_FACTORY_BYTECODE'
  },
  {
    name: 'ForwarderV4',
    path: 'ForwarderV4.sol/ForwarderV4.json',
    constantName: 'FORWARDER_V4_BYTECODE'
  },
  {
    name: 'ForwarderFactoryV4',
    path: 'ForwarderFactoryV4.sol/ForwarderFactoryV4.json',
    constantName: 'FORWARDER_FACTORY_V4_BYTECODE'
  }
];

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    console.log(`   Fetching: ${url.split('/').slice(-2).join('/')}`);

    https.get(url, (res) => {
      let data = '';

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        return;
      }

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`Failed to parse JSON from ${url}: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function fetchBytecodes() {
  console.log('🌐 Fetching bytecodes from GitHub...\n');

  const results = [];

  for (const contract of CONTRACTS) {
    console.log(`📄 Processing ${contract.name}...`);

    const url = `${GITHUB_RAW_BASE}/${contract.path}`;

    try {
      const artifact = await fetchJSON(url);

      if (!artifact.bytecode || artifact.bytecode === '0x') {
        console.error(`   ❌ No bytecode found for ${contract.name}`);
        continue;
      }

      const abi = artifact.abi || [];
      const bytecode = artifact.bytecode;

      console.log(`   ✅ Bytecode length: ${bytecode.length} characters`);
      console.log(`   ✅ Contract size: ${(bytecode.length / 2 - 1).toLocaleString()} bytes`);

      results.push({
        name: contract.name,
        constantName: contract.constantName,
        bytecode: bytecode,
        abi: abi,
        size: bytecode.length / 2 - 1,
      });
    } catch (error) {
      console.error(`   ❌ Error fetching ${contract.name}: ${error.message}`);
      console.error(`   Trying alternative path...`);

      // Try without artifacts prefix (some repos have different structure)
      try {
        const altUrl = `https://raw.githubusercontent.com/BitGo/eth-multisig-v4/master/${contract.path}`;
        const artifact = await fetchJSON(altUrl);

        if (artifact.bytecode && artifact.bytecode !== '0x') {
          results.push({
            name: contract.name,
            constantName: contract.constantName,
            bytecode: artifact.bytecode,
            abi: artifact.abi || [],
            size: artifact.bytecode.length / 2 - 1,
          });
          console.log(`   ✅ Found via alternative path`);
        }
      } catch (altError) {
        console.error(`   ❌ Alternative path also failed`);
      }
    }
  }

  return results;
}

function generateTypeScriptFile(results, outputPath) {
  console.log('\n📝 Generating TypeScript file...\n');

  let content = `/**
 * BitGo MultiSig V4 Contract Bytecodes
 *
 * Source: https://github.com/BitGo/eth-multisig-v4
 * Fetched from GitHub: ${new Date().toISOString()}
 * Solidity Version: 0.8.20
 *
 * DO NOT EDIT - Generated automatically
 */

`;

  // Add bytecodes
  results.forEach(r => {
    content += `// ${r.name} - ${r.size.toLocaleString()} bytes\n`;
    content += `export const ${r.constantName} = '${r.bytecode}';\n\n`;
  });

  // Add ABIs
  content += '\n// Contract ABIs\n\n';
  results.forEach(r => {
    content += `export const ${r.constantName.replace('BYTECODE', 'ABI')} = ${JSON.stringify(r.abi, null, 2)} as const;\n\n`;
  });

  fs.writeFileSync(outputPath, content);
  console.log(`✅ TypeScript file generated: ${outputPath}`);
  console.log(`   File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB\n`);
}

function updateContractDeploymentFile(templatePath) {
  console.log('📝 Updating contractDeployment.ts...\n');

  if (!fs.existsSync(templatePath)) {
    console.error(`❌ Template file not found: ${templatePath}`);
    return;
  }

  let content = fs.readFileSync(templatePath, 'utf8');

  // Check if already using imports
  if (content.includes('from \'./contractBytecodes.js\'')) {
    console.log('✅ File already imports from contractBytecodes.ts\n');
    return;
  }

  // Add import after other imports
  const importLine = "import { WALLET_SIMPLE_BYTECODE, WALLET_FACTORY_BYTECODE, FORWARDER_V4_BYTECODE, FORWARDER_FACTORY_V4_BYTECODE } from './contractBytecodes.js';";

  if (content.includes('import { AbiCoder }')) {
    content = content.replace(
      "import { AbiCoder } from 'ethers';",
      "import { AbiCoder } from 'ethers';\n" + importLine
    );
  } else if (content.includes("import Web3 from 'web3';")) {
    content = content.replace(
      "import Web3 from 'web3';",
      "import Web3 from 'web3';\n" + importLine
    );
  }

  // Remove placeholder bytecode constants
  content = content.replace(
    /\/\/ Contract ABIs and bytecodes\nconst WALLET_SIMPLE_BYTECODE = '0x608060\.\.\.';.*\nconst WALLET_FACTORY_BYTECODE = '0x608060\.\.\.';.*\nconst FORWARDER_V4_BYTECODE = '0x608060\.\.\.';.*\nconst FORWARDER_FACTORY_V4_BYTECODE = '0x608060\.\.\.';.*\n\n/,
    ''
  );

  // Remove individual placeholder lines
  content = content.replace(/const WALLET_SIMPLE_BYTECODE = '0x608060\.\.\.';.*\n/g, '');
  content = content.replace(/const WALLET_FACTORY_BYTECODE = '0x608060\.\.\.';.*\n/g, '');
  content = content.replace(/const FORWARDER_V4_BYTECODE = '0x608060\.\.\.';.*\n/g, '');
  content = content.replace(/const FORWARDER_FACTORY_V4_BYTECODE = '0x608060\.\.\.';.*\n/g, '');
  content = content.replace(/\/\/ Contract ABIs and bytecodes\n/g, '');

  fs.writeFileSync(templatePath, content);
  console.log(`✅ Updated: ${templatePath}\n`);
}

async function main() {
  console.log('🚀 BitGo Contract Bytecode Fetcher (GitHub Direct)\n');
  console.log('Repository: https://github.com/BitGo/eth-multisig-v4\n');

  try {
    // Fetch bytecodes from GitHub
    const results = await fetchBytecodes();

    if (results.length === 0) {
      console.error('\n❌ No bytecodes fetched. GitHub artifacts may not be available.');
      console.error('   Try running the local compilation method instead:');
      console.error('   ./QUICK_START.sh\n');
      process.exit(1);
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 Fetch Summary:\n');

    let totalSize = 0;
    results.forEach(r => {
      console.log(`${r.name}:`);
      console.log(`  Constant: ${r.constantName}`);
      console.log(`  Size: ${r.size.toLocaleString()} bytes`);
      console.log(`  ABI entries: ${r.abi.length}`);
      console.log('');
      totalSize += r.size;
    });

    console.log(`Total bytecode size: ${totalSize.toLocaleString()} bytes`);
    console.log('='.repeat(80) + '\n');

    // Generate output files
    const outputDir = path.join(__dirname, '..');
    const electronDir = path.join(outputDir, 'electron', 'ipc');

    // Create electron/ipc directory if it doesn't exist
    if (!fs.existsSync(electronDir)) {
      fs.mkdirSync(electronDir, { recursive: true });
    }

    // Generate bytecodes TypeScript file
    const bytecodesOutputPath = path.join(electronDir, 'contractBytecodes.ts');
    generateTypeScriptFile(results, bytecodesOutputPath);

    // Update contractDeployment.ts
    const deploymentPath = path.join(electronDir, 'contractDeployment.ts');
    if (fs.existsSync(deploymentPath)) {
      updateContractDeploymentFile(deploymentPath);
    } else {
      console.log('⚠️  contractDeployment.ts not found, skipping update\n');
    }

    console.log('='.repeat(80));
    console.log('✅ SUCCESS! Bytecodes fetched from GitHub.\n');
    console.log('Next steps:');
    console.log('  1. Review: electron/ipc/contractBytecodes.ts');
    console.log('  2. Build: npm run build');
    console.log('  3. Test: npm run dev');
    console.log('  4. Deploy on Hardhat local network\n');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('\nTry the local compilation method instead:');
    console.error('  ./QUICK_START.sh\n');
    process.exit(1);
  }
}

main();
