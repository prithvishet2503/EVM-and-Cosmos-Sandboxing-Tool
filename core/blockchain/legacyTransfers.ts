import type { Config } from '../config/base.js';
import type { TransferParams, TransferResult } from '../types/index.js';
import { createWeb3Instance } from './web3Utils.js';

export const executeTransfer = async (config: Config, params: TransferParams): Promise<TransferResult> => {
    const web3 = createWeb3Instance(config.rpc);
    // Ensure from, to, and value are always defined
    const from = params.from ?? config.sender.address;
    const to = params.to ?? config.receiver.address;
    const value = params.value ?? config.value;
    const fromPvtKey = params.fromPvtKey ?? config.sender.privateKey;

    console.log(`🔄 Executing transfer | Sender: ${from}, Receiver: ${to}, Amount: ${value}`);
    const limit = await config.getGasLimit(from, to);
    const gasPrice = await config.getGasPrice();
    const gasLimit = web3.utils.toHex(limit);
    const balance = await web3.eth.getBalance(from);
    const valueInWei = BigInt(web3.utils.toWei(value, 'ether'));
    const gasFee = BigInt(gasPrice.toString()) * BigInt(limit);
    const maxTransferable = BigInt(balance) - gasFee;

    if (maxTransferable < BigInt(0)) {
        throw new Error(
            `❌ Insufficient balance to cover gas fees.\n` +
            `💰 Wallet balance: ${web3.utils.fromWei(balance, 'ether')} ETH\n` +
            `🧮 Required gas fee: ${web3.utils.fromWei(gasFee.toString(), 'ether')} ETH`
        );
    }

    if(maxTransferable < valueInWei) {
        throw new Error(
            `❌ Insufficient balance: trying to send ${web3.utils.fromWei(valueInWei.toString(), 'ether')} ETH\n` +
            `➡️ Max transferable (after fees): ${web3.utils.fromWei(maxTransferable.toString(), 'ether')} ETH\n` +
            `💰 Wallet balance: ${web3.utils.fromWei(balance, 'ether')} ETH, Gas fee: ${web3.utils.fromWei(gasFee.toString(), 'ether')} ETH`
        );
    }

    console.log(`gasPrice: ${gasPrice}`)
    try {
        const txCount = await web3.eth.getTransactionCount(from);
        const tx = {
            nonce: txCount,
            from,
            to,
            gasLimit: gasLimit,
            gasPrice: web3.utils.toHex(gasPrice.toString()),
            value: web3.utils.toHex(valueInWei.toString()),
        };
        const estimatedCost = BigInt(limit) * BigInt(gasPrice.toString());
        const totalAmount = estimatedCost + BigInt(valueInWei);
        const balanceWei = await web3.eth.getBalance(from);
        console.log(`🔍 Account Balance in Wei: ${balanceWei}`);
        console.log(`🔍 Estimated Total Cost: ${web3.utils.fromWei(estimatedCost.toString(), 'ether')} ETH`);
        console.log(`📦 Total Spend (Value + Gas): ${web3.utils.fromWei(totalAmount.toString(), 'ether')} ETH`);
        const noncePending = await web3.eth.getTransactionCount(from, 'pending');
        const nonceLatest = await web3.eth.getTransactionCount(from, 'latest');
        console.log(`📌 Nonce (Pending): ${noncePending}, Nonce (Latest): ${nonceLatest}`);
        const signed = await web3.eth.accounts.signTransaction(tx, fromPvtKey);
        // Check if signing was successful
        if (!signed.rawTransaction) {
            throw new Error("Signing failed: rawTransaction is undefined.");
        }

        console.log("Raw Transaction:", signed.rawTransaction);
        console.log('✅ Transaction signed successfully! Broadcasting to network...');

        const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);
        console.log(`🎉 Transaction successful! Hash: ${receipt.transactionHash}`);
        console.log('💡 Use getBlockDetails, getTxnDetails commands to know more about the transaction');
        
        return {
            transactionHash: receipt.transactionHash.toString(),
            blockNumber: receipt.blockNumber.toString(),
            from: receipt.from.toString(),
            to: receipt.to.toString(),
            status: Boolean(receipt.status),
            gasUsed: receipt.gasUsed.toString()
        };
    } catch (error) {
        console.error('❌ Error in transfer:', error);
        throw error; // Re-throw to handle in calling function
    }
};
