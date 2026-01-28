#!/usr/bin/env node

/**
 * Script to extract contract bytecodes from BitGo eth-multisig-v4 artifacts
 *
 * Usage:
 *   1. Clone eth-multisig-v4 repo: git clone https://github.com/BitGo/eth-multisig-v4
 *   2. Install dependencies: cd eth-multisig-v4 && npm install
 *   3. Compile contracts: npx hardhat compile
 *   4. Run this script: node extractBytecodes.js <path-to-eth-multisig-v4>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Contract names to extract
const CONTRACTS = [
  {
    name: 'WalletSimple',
    path: 'contracts/WalletSimple.sol/WalletSimple.json',
    constantName: 'WALLET_SIMPLE_BYTECODE'
  },
  {
    name: 'WalletFactory',
    path: 'contracts/WalletFactory.sol/WalletFactory.json',
    constantName: 'WALLET_FACTORY_BYTECODE'
  },
  {
    name: 'ForwarderV4',
    path: 'contracts/ForwarderV4.sol/ForwarderV4.json',
    constantName: 'FORWARDER_V4_BYTECODE'
  },
  {
    name: 'ForwarderFactoryV4',
    path: 'contracts/ForwarderFactoryV4.sol/ForwarderFactoryV4.json',
    constantName: 'FORWARDER_FACTORY_V4_BYTECODE'
  }
];

function extractBytecode(repoPath) {
  console.log('🔍 Extracting bytecodes from BitGo eth-multisig-v4 artifacts...\n');

  const artifactsPath = path.join(repoPath, 'artifacts');

  if (!fs.existsSync(artifactsPath)) {
    console.error('❌ Error: artifacts directory not found!');
    console.error('   Please run "npx hardhat compile" in the eth-multisig-v4 directory first.');
    process.exit(1);
  }

  const results = [];
  const bytecodes = {};

  for (const contract of CONTRACTS) {
    const artifactPath = path.join(artifactsPath, contract.path);

    console.log(`📄 Processing ${contract.name}...`);

    if (!fs.existsSync(artifactPath)) {
      console.error(`   ❌ Artifact not found: ${artifactPath}`);
      continue;
    }

    try {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      const bytecode = artifact.bytecode;
      const abi = artifact.abi;

      if (!bytecode || bytecode === '0x') {
        console.error(`   ❌ No bytecode found for ${contract.name}`);
        continue;
      }

      bytecodes[contract.constantName] = bytecode;

      console.log(`   ✅ Bytecode length: ${bytecode.length} characters`);
      console.log(`   ✅ ABI functions: ${abi.filter(x => x.type === 'function').length}`);

      results.push({
        name: contract.name,
        constantName: contract.constantName,
        bytecode: bytecode,
        abi: abi,
        size: bytecode.length / 2 - 1, // Convert hex to bytes
      });
    } catch (error) {
      console.error(`   ❌ Error processing ${contract.name}: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 Extraction Summary:\n');

  results.forEach(r => {
    console.log(`${r.name}:`);
    console.log(`  Constant: ${r.constantName}`);
    console.log(`  Size: ${r.size.toLocaleString()} bytes`);
    console.log(`  ABI entries: ${r.abi.length}`);
    console.log('');
  });

  return results;
}

function generateTypeScriptFile(results, outputPath) {
  console.log('📝 Generating TypeScript file...\n');

  let content = `/**
 * BitGo MultiSig V4 Contract Bytecodes
 *
 * Extracted from: https://github.com/BitGo/eth-multisig-v4
 * Solidity Version: 0.8.20
 * Compiler: Hardhat
 *
 * Generated: ${new Date().toISOString()}
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
    content += `export const ${r.constantName.replace('BYTECODE', 'ABI')} = ${JSON.stringify(r.abi, null, 2)};\n\n`;
  });

  fs.writeFileSync(outputPath, content);
  console.log(`✅ TypeScript file generated: ${outputPath}`);
  console.log(`   File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB\n`);
}

function generateContractDeploymentFile(results, templatePath, outputPath) {
  console.log('📝 Updating contractDeployment.ts...\n');

  if (!fs.existsSync(templatePath)) {
    console.error(`❌ Template file not found: ${templatePath}`);
    return;
  }

  let content = fs.readFileSync(templatePath, 'utf8');

  // Replace import
  content = content.replace(
    "import Web3 from 'web3';",
    "import Web3 from 'web3';\nimport { WALLET_SIMPLE_BYTECODE, WALLET_FACTORY_BYTECODE, FORWARDER_V4_BYTECODE, FORWARDER_FACTORY_V4_BYTECODE } from './contractBytecodes.js';"
  );

  // Replace placeholder bytecodes
  content = content.replace(
    /const WALLET_SIMPLE_BYTECODE = '0x608060\.\.\.';.*\n/,
    ''
  );
  content = content.replace(
    /const WALLET_FACTORY_BYTECODE = '0x608060\.\.\.';.*\n/,
    ''
  );
  content = content.replace(
    /const FORWARDER_V4_BYTECODE = '0x608060\.\.\.';.*\n/,
    ''
  );
  content = content.replace(
    /const FORWARDER_FACTORY_V4_BYTECODE = '0x608060\.\.\.';.*\n/,
    ''
  );

  // Remove the "Contract ABIs and bytecodes" comment section
  content = content.replace(
    /\/\/ Contract ABIs and bytecodes\n/,
    ''
  );

  fs.writeFileSync(outputPath, content);
  console.log(`✅ Updated: ${outputPath}\n`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node extractBytecodes.js <path-to-eth-multisig-v4>');
    console.error('\nExample:');
    console.error('  node extractBytecodes.js ../eth-multisig-v4');
    process.exit(1);
  }

  const repoPath = path.resolve(args[0]);

  console.log('🚀 BitGo Contract Bytecode Extractor\n');
  console.log(`Repository: ${repoPath}\n`);

  if (!fs.existsSync(repoPath)) {
    console.error(`❌ Error: Directory not found: ${repoPath}`);
    process.exit(1);
  }

  // Extract bytecodes
  const results = extractBytecode(repoPath);

  if (results.length === 0) {
    console.error('\n❌ No bytecodes extracted. Please check the artifacts directory.');
    process.exit(1);
  }

  // Generate output files
  const outputDir = path.join(__dirname, '..');
  const electronDir = path.join(outputDir, 'electron', 'ipc');

  // Generate bytecodes TypeScript file
  const bytecodesOutputPath = path.join(electronDir, 'contractBytecodes.ts');
  generateTypeScriptFile(results, bytecodesOutputPath);

  // Update contractDeployment.ts
  const templatePath = path.join(electronDir, 'contractDeployment.ts');
  const deploymentOutputPath = templatePath;
  generateContractDeploymentFile(results, templatePath, deploymentOutputPath);

  console.log('='.repeat(80));
  console.log('✅ SUCCESS! Bytecodes extracted and files updated.\n');
  console.log('Next steps:');
  console.log('  1. Review the generated files');
  console.log('  2. Test deployment on a local network (Hardhat)');
  console.log('  3. Deploy to testnet (Sepolia) for verification');
  console.log('\n' + '='.repeat(80));
}

main();
