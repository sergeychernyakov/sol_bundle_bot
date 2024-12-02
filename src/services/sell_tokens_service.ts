import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { bundleTransaction } from '../utils/bundle_transaction';
import { getWallets } from '../clients/wallet_client';
import readlineSync from 'readline-sync';
import * as dotenv from 'dotenv';

dotenv.config();

const TOKEN_MINT_ADDRESS = process.env.TOKEN_MINT_ADDRESS!;
const QUICK_NODE_API_KEY = process.env.QUICK_NODE_API_KEY!;
const connection = new Connection(`https://solana-mainnet.quiknode.pro/${QUICK_NODE_API_KEY}`, 'confirmed');

export class SellTokensService {
  async sellTokens(): Promise<void> {
    const tokenMint = new PublicKey(TOKEN_MINT_ADDRESS);
    const wallets = getWallets();

    const totalAmountInput: string = readlineSync.question('Введите общее количество токенов для продажи (по умолчанию 10000): ');
    const amount: number = parseFloat(totalAmountInput) || 10000;

    for (const wallet of wallets) {
      const transaction = new Transaction().add(
        new TransactionInstruction({
          keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: true }],
          data: Buffer.from([amount]),
          programId: tokenMint,
        })
      );

      await bundleTransaction(connection, transaction, [wallet]);
      console.log(`Sold tokens with wallet: ${wallet.publicKey.toString()}`);
    }
  }
}
