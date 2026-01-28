import type { Account } from '../types/index.js';

export abstract class Config {
    abstract rpc: string;
    abstract chainId: number;
    abstract networkId: number;
    abstract chainName: string;
    // Accounts
    sender: Account = { privateKey: "", address: "" };
    receiver: Account = { privateKey: "", address: "" };
    secondAccount: Account = { privateKey: "", address: "0x9378c12BD7502A11F770a5C1F223c959B2805dA9" };

    async getGasLimit(sender?: any, receiver?: any): Promise<string> {
        return '21000'; // Default gas limit logic
    }

    async getGasPrice(): Promise<BigInt> {
        return BigInt('5000000000'); // Default gas price logic
    }

    get value(): string {
        return "0.0001"; //default value - reduced to prevent gas limit exceeded errors
    }

    async loadAccounts(chain: string) {
        try {
            const accountsModule = await import(`../${chain}/accounts`);
            const { accounts } = accountsModule;
            this.sender = accounts.sender;
            this.receiver = accounts.receiver;
            console.log(`../${chain}/config, sender: ${this.sender.address} receiver: ${this.receiver.address}`);
        } catch (error) {
            console.error(`Failed to load accounts for ${chain}:`, error);
        }
    }
}
