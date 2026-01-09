import Web3 from 'web3';
import type { Config } from '../config/base.js';
import * as ethUtil from 'ethereumjs-util';

export const createWeb3Instance = (rpcUrl: string): Web3 => {
    return new Web3(new Web3.providers.HttpProvider(rpcUrl));
};

export const getBlockDetails = async (web3: Web3, blockNumberOrHash: string) => {
    try {
        const block = await web3.eth.getBlock(blockNumberOrHash);
        if (!block) {
            throw new Error('Block not found');
        }
        console.log('\n📦 Block Details:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Block Number:', block.number);
        console.log('Timestamp:', new Date(Number(block.timestamp) * 1000).toLocaleString());
        console.log('Hash:', block.hash);
        console.log('Parent Hash:', block.parentHash);
        console.log('Transactions:', block.transactions.length);
        console.log('Gas Used:', block.gasUsed.toString());
        console.log('Gas Limit:', block.gasLimit.toString());
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'message' in error) {
            console.error('❌ Error fetching block details:', (error as { message: string }).message);
        } else {
            console.error('❌ Error fetching block details:', error);
        }
        throw error;
    }
};

export const getTransactionDetails = async (web3: Web3, txnHash: string) => {
    try {
        const transaction = await web3.eth.getTransaction(txnHash);
        if (!transaction) {
            throw new Error('Transaction not found');
        }
        console.log('\n🔍 Transaction Details:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Hash:', transaction.hash);
        console.log('Block Number:', transaction.blockNumber);
        console.log('From:', transaction.from);
        console.log('To:', transaction.to);
        console.log('Value:', web3.utils.fromWei(transaction.value.toString(), 'ether'), 'ETH');
        console.log('Gas Price:', web3.utils.fromWei(transaction.gasPrice.toString(), 'gwei'), 'Gwei');
        console.log('Gas Limit:', transaction.gas.toString());
        console.log('Nonce:', transaction.nonce);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'message' in error) {
            console.error('❌ Error fetching transaction details:', (error as { message: string }).message);
        } else {
            console.error('❌ Error fetching transaction details:', error);
        }
        throw error;
    }
};

export const getBalance = async (web3: Web3, label: string, address: string): Promise<void> => {
    try {
        const balance = await web3.eth.getBalance(address);
        console.log('\n💰 Balance Information:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Address:', address);
        console.log('Balance:', web3.utils.fromWei(balance, 'ether'), 'ETH');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }catch (error) {
        if (typeof error === 'object' && error !== null && 'message' in error) {
            console.error(`❌ Error fetching ${label} balance:`, (error as { message: string }).message);
        } else {
            console.error(`❌ Error fetching ${label} balance:`, error);
        }
        throw error;
    }
};

export const getChainDetails = async(web3: Web3): Promise<void> => {
    try {
        const chainId = await web3.eth.getChainId();
        console.log('\n⛓️ Chain Details:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Chain ID:', chainId);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'message' in error) {
            console.error('❌ Error fetching chain details:', (error as { message: string }).message);
        } else {
            console.error('❌ Error fetching chain details:', error);
        }
        throw error;
    }
};

export const getGasLimit = async (config: Config, sender?: string, receiver?: string): Promise<string> => {
    try {
        const web3 = new Web3(new Web3.providers.HttpProvider(config.rpc));

        const fromAddress = sender || config.sender.address;
        const toAddress = receiver || config.receiver.address;

        const gasLimit = await web3.eth.estimateGas({
            from: fromAddress,
            to: toAddress,
            value: web3.utils.toWei('0.00001', 'ether'),
            data: '0x',
            common: {
                customChain: {
                    name: config.chainName,
                    networkId: config.networkId,
                    chainId: config.chainId,
                },
            },
        });

        console.log('\n⛽ Gas Limit:', gasLimit.toString());
        return ethUtil.addHexPrefix(gasLimit.toString(16));
    }catch (error) {
        if (typeof error === 'object' && error !== null && 'message' in error) {
            console.error('❌ Error estimating gas limit:', (error as { message: string }).message);
        } else {
            console.error('❌ Error estimating gas limit:', error);
        }
        throw error;
    }
};

export const getGasPrice = async (web3: Web3): Promise<BigInt> => {
    try {
        const gasPrice = await web3.eth.getGasPrice();
        console.log('\n⛽ Gas Price:', web3.utils.fromWei(gasPrice.toString(), 'gwei'), 'Gwei');
        return gasPrice;
    }catch (error) {
        if (typeof error === 'object' && error !== null && 'message' in error) {
            console.error('❌ Error fetching gas price:', (error as { message: string }).message);
        } else {
            console.error('❌ Error fetching gas price:', error);
        }
        throw error;
    }
};
