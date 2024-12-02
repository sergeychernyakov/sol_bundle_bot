import readlineSync from 'readline-sync';
import { WalletClient } from '../clients/wallet_client';
import { TOKENS, getTokenConfig } from '../config/tokens_config';
import { PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import BN from 'bn.js';

type TokenSymbol = keyof typeof TOKENS;
const LAMPORTS_PER_SOL = 1_000_000_000; // Константа для перевода SOL в лампорты

export class SellTokensService {
  private walletClient: WalletClient;

  constructor() {
    this.walletClient = new WalletClient();
  }

  async sellTokens(): Promise<void> {
    let tokenSymbol: TokenSymbol = process.env.SELL_TOKEN_SYMBOL as TokenSymbol;
    if (!tokenSymbol) {
      tokenSymbol = readlineSync.question('Введите символ токена для продажи (например, SOL): ') as TokenSymbol;
    }

    if (!(tokenSymbol in TOKENS)) {
      throw new Error(`Неподдерживаемый символ токена для продажи: ${tokenSymbol}`);
    }

    const totalAmountInput: string = readlineSync.question('Введите общее количество токенов для продажи (по умолчанию 10000): ');
    const amount: number = parseFloat(totalAmountInput) || 10000;

    const wallet = this.walletClient.loadWallet();
    const connection = this.walletClient.getConnection();

    if (tokenSymbol === 'SOL') {
      await this.sellSol(wallet.publicKey, amount, connection);
    } else {
      await this.sellGenericToken(tokenSymbol, wallet.publicKey, amount, connection);
    }
  }

  private async sellSol(walletPubkey: PublicKey, amount: number, connection: any) {
    const lamports = amount * LAMPORTS_PER_SOL;

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: walletPubkey,
        toPubkey: walletPubkey, // Здесь должен быть адрес получателя
        lamports: -lamports,
      })
    );

    const signature = await connection.sendTransaction(transaction, []);
    await connection.confirmTransaction(signature, 'confirmed');

    console.log('SOL-транзакция продажи подтверждена');
  }

  private async sellGenericToken(tokenSymbol: TokenSymbol, walletPubkey: PublicKey, amount: number, connection: any) {
    const token = getTokenConfig(tokenSymbol);

    // Преобразуем количество токенов в минимальные единицы
    const mintAddress = new PublicKey(token.address!);
    const amountInSmallestUnit = new BN(amount * Math.pow(10, token.decimals));

    const transaction = new Transaction();

    const dexInstruction = new TransactionInstruction({
      keys: [
        { pubkey: walletPubkey, isSigner: true, isWritable: true },
        { pubkey: mintAddress, isSigner: false, isWritable: true }, // Адрес токена
      ],
      programId: new PublicKey(process.env.DEX_PROGRAM_ID!),
      data: Buffer.from(Uint8Array.of(2, ...amountInSmallestUnit.toArray('le', 8))),
    });

    transaction.add(dexInstruction);

    const signature = await connection.sendTransaction(transaction, [walletPubkey]);
    await connection.confirmTransaction(signature, 'confirmed');

    console.log('Транзакция токена подтверждена');
  }
}
