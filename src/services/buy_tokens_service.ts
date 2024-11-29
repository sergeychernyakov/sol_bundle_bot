import { WalletClient } from '../clients/wallet_client';
import { TOKENS, getTokenConfig } from '../config/tokens_config';
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';

type TokenSymbol = keyof typeof TOKENS;

export class BuyTokensService {
  private walletClient: WalletClient;

  constructor() {
    this.walletClient = new WalletClient();
  }

  async buyTokens(tokenSymbol: TokenSymbol, amount: number): Promise<void> {
    const wallet = this.walletClient.loadWallet();
    const token = getTokenConfig(tokenSymbol);

    const transaction = new Transaction();
    const dexInstruction = new TransactionInstruction({
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: false, isWritable: true },
        ],
        programId: new PublicKey(process.env.DEX_PROGRAM_ID!),
        data: Buffer.from(Uint8Array.of(1, ...new Uint8Array(new ArrayBuffer(8)))),
    });

    transaction.add(dexInstruction);

    console.log(`Preparing to buy ${amount} ${tokenSymbol} tokens.`);

    const connection = this.walletClient.getConnection();
    const signature = await connection.sendTransaction(transaction, [wallet]);
    await connection.confirmTransaction(signature, 'confirmed');

    console.log(`Transaction confirmed. Signature: ${signature}`);
  }
}
