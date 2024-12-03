import {
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

export class BuyTokensService {
  async buyTokens(): Promise<void> {
    const tokenMint = new PublicKey(TOKEN_MINT_ADDRESS);
    const wallets = getWallets();

    const totalAmountInput: string = readlineSync.question('Введите общее количество токенов для покупки (по умолчанию 20000): ');
    const amount: number = parseFloat(totalAmountInput) || 20000;

    for (const wallet of wallets) {
      const transaction = new Transaction().add(
        new TransactionInstruction({
          keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: true }],
          data: Buffer.from([amount]),
          programId: tokenMint,
        })
      );

      await bundleTransaction([transaction], [wallet]);
      console.log(`Purchased tokens with wallet: ${wallet.publicKey.toString()}`);
    }
  }
}
