import { ECDSA, Ecdsa } from '@bitgo/sdk-core';
import { encodeSecp256k1Pubkey, encodeSecp256k1Signature, pubkeyToAddress } from '@cosmjs/amino';
import { Secp256k1Signature } from '@cosmjs/crypto';
import { fromBase64, fromHex, toBase64 } from '@cosmjs/encoding';
import { encodePubkey, makeAuthInfoBytes, makeSignBytes, makeSignDoc } from '@cosmjs/proto-signing';
import { SignDoc, TxRaw, TxBody } from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import { MsgSend } from 'cosmjs-types/cosmos/bank/v1beta1/tx';
import { Any } from 'cosmjs-types/google/protobuf/any';
import axios from 'axios';
import { CosmosConfig } from './cosmosConfig';
import { CosmosTransferResult } from './cosmosTypes';

export class CosmosTssTransferService {
  private config: CosmosConfig;
  private MPC: Ecdsa;

  constructor(config: CosmosConfig) {
    this.config = config;
    this.MPC = new Ecdsa();
  }

  /**
   * Execute TSS transfer for Cosmos chain
   */
  async executeTssTransfer(
    tssShares: {
      A: any;
      B: any;
      C: any;
    },
    accountNumber: number,
    sequence: number = 0
  ): Promise<CosmosTransferResult> {
    try {
      console.log('🔄 Executing Cosmos TSS Transfer...');

      const A = tssShares.A;
      const B = tssShares.B;
      const C = tssShares.C;

      // Combine keys
      const aKeyCombine = this.MPC.keyCombine(A.pShare, [B.nShares[1], C.nShares[1]]);
      const bKeyCombine = this.MPC.keyCombine(B.pShare, [A.nShares[2], C.nShares[2]]);
      const publicKey = aKeyCombine.xShare.y;

      console.log('🔑 Public Key:', publicKey);

      // Derive sender address from public key
      const sender = pubkeyToAddress(
        {
          type: 'tendermint/PubKeySecp256k1',
          value: toBase64(fromHex(publicKey)),
        },
        this.config.addressPrefix
      );

      console.log('📤 Sender Address:', sender);

      // Create sign document
      const signDoc = this.createSignDoc(
        publicKey,
        sender,
        this.config.receiver.address,
        accountNumber,
        sequence
      );

      console.log('🔏 Signing with TSS...');

      // Perform TSS signing
      const signature = this.tssSign(aKeyCombine, bKeyCombine, signDoc);

      console.log('✅ TSS Signing complete');

      // Create signed transaction
      const signedTx = this.createSignedTxRaw(publicKey, signDoc, signature);

      // Encode transaction
      const signedTxBytes = TxRaw.encode(signedTx).finish();

      console.log('📡 Broadcasting transaction...');

      // Broadcast transaction
      const result = await this.broadcastTransaction(toBase64(signedTxBytes));

      console.log('🎉 Transaction successful!');
      console.log(`📋 TX Hash: ${result.transactionHash}`);

      return {
        transactionHash: result.transactionHash,
        blockHeight: result.blockHeight,
        from: sender,
        to: this.config.receiver.address,
        amount: this.config.transactionAmount,
        denom: this.config.denom,
        gasUsed: result.gasUsed,
      };
    } catch (error: any) {
      console.error('❌ TSS Transfer failed:', error.message);
      throw error;
    }
  }

  /**
   * TSS signing process (7 steps)
   */
  private tssSign(aKeyCombine: any, bKeyCombine: any, signDoc: SignDoc): any {
    const signerOne = aKeyCombine;
    const signerOneIndex = aKeyCombine.xShare.i;
    const signerTwo = bKeyCombine;
    const signerTwoIndex = bKeyCombine.xShare.i;

    // Step 1: Sign Shares
    const signShares: ECDSA.SignShareRT = this.MPC.signShare(
      signerOne.xShare,
      signerOne.yShares[signerTwoIndex]
    );

    // Step 2: Sign Convert (Signer 2)
    let signConvertS21: ECDSA.SignConvertRT = this.MPC.signConvert({
      xShare: signerTwo.xShare,
      yShare: signerTwo.yShares[signerOneIndex],
      kShare: signShares.kShare,
    });

    // Step 3: Sign Convert (Signer 1)
    const signConvertS12: ECDSA.SignConvertRT = this.MPC.signConvert({
      aShare: signConvertS21.aShare,
      wShare: signShares.wShare,
    });

    // Step 4: Sign Convert (Signer 2 continued)
    signConvertS21 = this.MPC.signConvert({
      muShare: signConvertS12.muShare,
      bShare: signConvertS21.bShare,
    });

    // Step 5: Sign Combine
    const [signCombineOne, signCombineTwo] = [
      this.MPC.signCombine({
        gShare: signConvertS12.gShare as ECDSA.GShare,
        signIndex: {
          i: (signConvertS12.muShare as ECDSA.MUShare).i,
          j: (signConvertS12.muShare as ECDSA.MUShare).j,
        },
      }),
      this.MPC.signCombine({
        gShare: signConvertS21.gShare as ECDSA.GShare,
        signIndex: {
          i: (signConvertS21.muShare as ECDSA.MUShare).i,
          j: (signConvertS21.muShare as ECDSA.MUShare).j,
        },
      }),
    ];

    // Step 6: Sign the message
    const signBytes = makeSignBytes(signDoc);
    const tx = Buffer.from(signBytes);

    const [signA, signB] = [
      this.MPC.sign(tx, signCombineOne.oShare, signCombineTwo.dShare, undefined, true),
      this.MPC.sign(tx, signCombineTwo.oShare, signCombineOne.dShare, undefined, true),
    ];

    // Step 7: Construct signature
    const signature = this.MPC.constructSignature([signA, signB]);

    // Verify signature
    console.assert(this.MPC.verify(tx, signature), 'Signature verification failed!');
    console.log('✅ Signature verified');

    return signature;
  }

  /**
   * Create sign document for Cosmos transaction
   */
  private createSignDoc(
    senderPublicKey: string,
    senderAddress: string,
    receiverAddress: string,
    accountNumber: number,
    sequence: number
  ): SignDoc {
    const amount = parseInt(this.config.transactionAmount);
    const feeAmount = parseInt(this.config.gasAmount);
    const gasLimit = parseInt(this.config.gasLimit);
    const denom = this.config.denom;

    // Create send message
    const sendMessage: Any = {
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: MsgSend.encode(
        MsgSend.fromPartial({
          fromAddress: senderAddress,
          toAddress: receiverAddress,
          amount: [{ denom, amount: amount.toString() }],
        })
      ).finish(),
    };

    // Create transaction body
    const txBodyValue = {
      messages: [sendMessage],
    };
    const txBodyBytes = TxBody.encode(TxBody.fromPartial(txBodyValue)).finish();

    // Create auth info
    const pubkey: Any = encodePubkey(encodeSecp256k1Pubkey(Buffer.from(senderPublicKey, 'hex')));
    const authInfoBytes = makeAuthInfoBytes(
      [{ pubkey, sequence }],
      [{ denom, amount: feeAmount.toString() }],
      gasLimit
    );

    return makeSignDoc(txBodyBytes, authInfoBytes, this.config.chainId, accountNumber);
  }

  /**
   * Create signed transaction raw
   */
  private createSignedTxRaw(pubkey: string, signDoc: SignDoc, signature: any): TxRaw {
    const signatureBytes = new Secp256k1Signature(
      fromHex(signature.r),
      fromHex(signature.s)
    ).toFixedLength();

    const stdSignature = encodeSecp256k1Signature(fromHex(pubkey), signatureBytes);

    return TxRaw.fromPartial({
      bodyBytes: signDoc.bodyBytes,
      authInfoBytes: signDoc.authInfoBytes,
      signatures: [fromBase64(stdSignature.signature)],
    });
  }

  /**
   * Broadcast transaction to Cosmos chain
   */
  private async broadcastTransaction(txBase64: string): Promise<{
    transactionHash: string;
    blockHeight: number;
    gasUsed: string;
  }> {
    try {
      // Construct API URL (assumes standard Cosmos REST API)
      const apiUrl = this.config.rpc.replace('/rpc', '/api') || `${this.config.rpc}/cosmos/tx/v1beta1/txs`;

      const response = await axios.post(
        apiUrl,
        {
          tx_bytes: txBase64,
          mode: 'BROADCAST_MODE_SYNC',
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.tx_response.code !== 0) {
        throw new Error(`Transaction failed: ${response.data.tx_response.raw_log}`);
      }

      return {
        transactionHash: response.data.tx_response.txhash,
        blockHeight: parseInt(response.data.tx_response.height),
        gasUsed: response.data.tx_response.gas_used,
      };
    } catch (error: any) {
      console.error('❌ Broadcast failed:', error.response?.data || error.message);
      throw error;
    }
  }
}
