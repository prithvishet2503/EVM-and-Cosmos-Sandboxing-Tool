import Web3 from 'web3';
import Keccak from 'keccak';
import type { Hash } from 'crypto';
import { Ecdsa, ECDSAMethodTypes } from '@bitgo/sdk-core';
import * as EthTx from '@ethereumjs/tx';
import * as ethUtil from 'ethereumjs-util';
import * as EthCommon from '@ethereumjs/common';
import type { Config } from '../config/base.js';
import type { TransferParams } from '../types/index.js';
import type * as EthCommonType from "@ethereumjs/common";
import type * as EthTxLibType from "@ethereumjs/tx";

export const executeTssTransfer = async (config: Config, params: TransferParams) => {
    const MPC = new Ecdsa();
    const secondAccount = config.secondAccount;
    const receiver = config.receiver;

    // Load TSS Shares - use dynamic import with proper path resolution
    const { default: fixtures } = await import('../config/fixtures.json', { assert: { type: 'json' } });
    const { userXShare, userYShare, backupXShare, backupYShare } = fixtures.tss;

    // Signing process steps
    const signShares = await MPC.signShare(userXShare, userYShare);
    const signConvertS21 = await MPC.signConvertStep1({
        xShare: backupXShare,
        yShare: backupYShare,
        kShare: signShares.kShare,
    });
    const signConvertS12 = await MPC.signConvertStep2({
        aShare: signConvertS21.aShare,
        wShare: signShares.wShare,
    });
    const signConvertS21_2 = await MPC.signConvertStep3({
        muShare: signConvertS12.muShare,
        bShare: signConvertS21.bShare,
    });

    const signCombineOne = MPC.signCombine({
        gShare: signConvertS12.gShare,
        signIndex: signConvertS12.muShare,
    });
    const signCombineTwo = MPC.signCombine({
        gShare: signConvertS21_2.gShare,
        signIndex: signConvertS21_2.signIndex,
    });

    // Web3 Setup
    const web3 = new Web3(new Web3.providers.HttpProvider(config.rpc));
    const balance = await web3.eth.getBalance(secondAccount.address);
    const gasLimit = BigInt(await config.getGasLimit(secondAccount.address, receiver.address));
    const feeHistory = await web3.eth.getFeeHistory(1, 'latest', []);
    const baseFeePerGas = BigInt(feeHistory.baseFeePerGas[0]);
    const maxPriorityFeePerGas = BigInt(web3.utils.toWei('2', 'gwei'));
    const value = BigInt(web3.utils.toWei(config.value, 'ether'));
    const maxFeePerGas = baseFeePerGas + maxPriorityFeePerGas;
    console.log(`ℹ️ balance: ${balance}, maxFeePerGas: ${maxFeePerGas}, gasLimit: ${gasLimit}, value: ${value}`);
    if (BigInt(balance) < maxFeePerGas * gasLimit + value) {
        const required = maxFeePerGas * gasLimit + value;
        throw new Error(
            `❌ Insufficient balance for transaction.\n` +
            `💰 Balance: ${web3.utils.fromWei(balance.toString(), 'ether')} ETH\n` +
            `📊 Required: ${web3.utils.fromWei(required.toString(), 'ether')} ETH`
        );
    }

    const baseParams = {
        from: secondAccount.address,
        to: receiver.address,
        nonce: web3.utils.toHex(await web3.eth.getTransactionCount(secondAccount.address, 'pending')),
        value: web3.utils.toHex(value),
        data: '0x',
        maxFeePerGas: web3.utils.toHex(maxFeePerGas),
        maxPriorityFeePerGas: web3.utils.toHex(maxPriorityFeePerGas),
        gasLimit: web3.utils.toHex(gasLimit)
    };

    // Transaction Creation & Signing
    const defaultCommon = EthCommon.Common.custom({
        name: config.chainName,
        networkId: config.networkId,
        chainId: config.chainId,
    }, { hardfork: 'london' });

    const unsignedTx = EthTx.FeeMarketEIP1559Transaction.fromTxData(baseParams, { common: defaultCommon });
    const signableHex = unsignedTx.getMessageToSign(false).toString('hex');
    const MESSAGE = Buffer.from(signableHex, 'hex');

    const signA = MPC.sign(MESSAGE, signCombineOne.oShare, signCombineTwo.dShare, Keccak('keccak256') as Hash);
    const signB = MPC.sign(MESSAGE, signCombineTwo.oShare, signCombineOne.dShare, Keccak('keccak256') as Hash);

    const signature = MPC.constructSignature([signA, signB]);
    const tx = await getSignedTxFromSignature(defaultCommon, unsignedTx, signature);
    const txHex = ethUtil.addHexPrefix(tx.serialize().toString('hex'));
    console.log(`Signed Tx: ${txHex}`);
    console.log(`Executing transaction on ${config.chainName}`);
    const receipt = await web3.eth.sendSignedTransaction(txHex);
    console.log('🎉 Transaction successful! Hash:', receipt.transactionHash);
    console.log('💡Use getBlockDetails, getTxnDetails commands to know more about the transaction');

    return {
        transactionHash: receipt.transactionHash.toString(),
        blockNumber: receipt.blockNumber.toString(),
        from: receipt.from.toString(),
        to: receipt.to ? receipt.to.toString() : receiver.address,
        status: Boolean(receipt.status),
        gasUsed: receipt.gasUsed.toString()
    };
};

async function getSignedTxFromSignature(ethCommon: EthCommonType.default, tx: EthTxLibType.FeeMarketEIP1559Transaction | EthTxLibType.Transaction, signature: ECDSAMethodTypes.Signature) {
    const txData = tx.toJSON();
    const yParity = signature.recid;
    const baseParams = {
        to: txData.to,
        nonce: new ethUtil.BN(ethUtil.stripHexPrefix(txData.nonce!), 'hex'),
        value: new ethUtil.BN(ethUtil.stripHexPrefix(txData.value!), 'hex'),
        gasLimit: new ethUtil.BN(ethUtil.stripHexPrefix(txData.gasLimit!), 'hex'),
        data: txData.data,
        r: ethUtil.addHexPrefix(signature.r),
        s: ethUtil.addHexPrefix(signature.s),
    };

    const signedTx = EthTx.FeeMarketEIP1559Transaction.fromTxData(
        {
            ...baseParams,
            maxPriorityFeePerGas: new ethUtil.BN(ethUtil.stripHexPrefix(txData.maxPriorityFeePerGas!), 'hex'),
            maxFeePerGas: new ethUtil.BN(ethUtil.stripHexPrefix(txData.maxFeePerGas!), 'hex'),
            v: new ethUtil.BN(yParity.toString()),
        },
        { common: ethCommon },
    );
    console.log(`maxFees:: ${signedTx.maxFeePerGas}`);
    console.log(`Signed Tx Details: ${JSON.stringify(signedTx.toJSON(), null, 2)}`);
    return signedTx;
}
