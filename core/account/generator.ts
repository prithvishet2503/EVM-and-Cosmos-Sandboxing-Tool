import Web3 from 'web3';
import fs from 'fs';
import path from 'path';
import { createWeb3Instance } from '../blockchain/web3Utils.js';
import type { Config } from '../config/base.js';
import type { Account } from '../types/index.js';

export const generateAccount = (web3: Web3): Account => {
    const account = web3.eth.accounts.create();
    return {
        privateKey: account.privateKey,
        address: account.address
    };
};

const ensureDirectoryExists = (dir: string) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

const writeAccountToFile = (chain: string, accounts: Record<string, any>) => {
    const dir = path.join(__dirname, `../${chain}`);
    ensureDirectoryExists(dir);
    const filePath = path.join(dir, 'accounts.ts');

    const content = `export const accounts = ${JSON.stringify(accounts, null, 2)};`;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Accounts successfully saved for ${chain} at ${filePath}`);
};


export const executeGenerateAccount = async (config: Config) => {
        const args = process.argv.slice(2);
        if (args.length !== 2 || args[1] !== 'createUserAccount') {
            console.error('Usage: npx tsx runChainUtils <chain> generateAccount');
            process.exit(1);
        }

        const chain = args[0];
        const rpcUrl = config.rpc;
        if (!rpcUrl) {
            console.error(`Missing RPC URL for ${chain}. Set ${chain.toUpperCase()}_RPC in env.`);
            process.exit(1);
        }

        const web3 = createWeb3Instance(rpcUrl);
        const accounts = {
            sender: generateAccount(web3),
            receiver: generateAccount(web3),
            secondAccount: { privateKey: "", address: "0x9378c12BD7502A11F770a5C1F223c959B2805dA9" }
        };
        writeAccountToFile(chain, accounts);
};
