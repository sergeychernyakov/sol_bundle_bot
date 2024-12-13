import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Keypair,
  sendAndConfirmTransaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountInstruction,
  getAccount,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { getWallets } from '../clients/wallet_client';
import readlineSync from 'readline-sync';
import { distributeAmount } from '../utils/amount_helper';
import { struct, u8, nu64 } from '@solana/buffer-layout';
import * as dotenv from 'dotenv';
dotenv.config();

export class BuyTokensWithoutBundle {
  private connection: Connection;
  private raydiumProgramId: PublicKey;
  private outputMint: PublicKey;
  private wsolMintAddress: PublicKey;

  constructor() {
    this.raydiumProgramId = new PublicKey(process.env.RAYDIUM_PROGRAM_ID!);
    this.outputMint = new PublicKey(process.env.OUTPUT_MINT!);
    this.connection = new Connection(`https://necessary-light-shape.solana-mainnet.quiknode.pro/${process.env.QUICK_NODE_API_KEY}/`);
    this.wsolMintAddress = new PublicKey(process.env.WSOL_MINT_ADDRESS!);
  }

  async swapSolToToken(): Promise<void> {
    try {
      const wallets = getWallets();
      console.log('Начинаем обмен SOL на токены через Raydium...');

      const totalAmountInput: string = readlineSync.question('Введите общее количество токенов для покупки (по умолчанию 0.0000001): ');
      const amount: number = parseFloat(totalAmountInput) || 0.0000001;

      const amounts: number[] = distributeAmount(amount, wallets.length);
      console.log('Amounts distributed among wallets:', amounts);

      const requiredLamports = amounts[0] * LAMPORTS_PER_SOL;
      const currentBalance = await this.connection.getBalance(wallets[0].publicKey);
      console.log(`Баланс кошелька: ${currentBalance / LAMPORTS_PER_SOL} SOL`);

      if (currentBalance < requiredLamports) {
        throw new Error(`Недостаточно средств на кошельке. Текущий баланс: ${currentBalance / LAMPORTS_PER_SOL} SOL, требуется: ${requiredLamports / LAMPORTS_PER_SOL} SOL`);
      }

      const userDestinationTokenAccount = await this.getOrCreateAssociatedTokenAccount(wallets[0], this.outputMint);
      const wrappedSolAccount = await this.getOrCreateAssociatedTokenAccount(wallets[0], this.wsolMintAddress);

      if (!wrappedSolAccount || !userDestinationTokenAccount) {
        throw new Error('Не удалось создать учетные записи WSOL или токенов назначения.');
      }

      const transferTransaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallets[0].publicKey,
          toPubkey: wrappedSolAccount,
          lamports: requiredLamports,
        })
      );

      const { blockhash: transferBlockhash } = await this.connection.getLatestBlockhash('finalized');
      transferTransaction.recentBlockhash = transferBlockhash;
      
      transferTransaction.feePayer = wallets[0].publicKey;
      transferTransaction.sign(wallets[0]);
      const transferTxId = await sendAndConfirmTransaction(this.connection, transferTransaction, [wallets[0]]);
      console.log('Перевод SOL завершен. Подпись транзакции:', transferTxId);

      // Создаем инструкцию для обмена
      const swapInstruction = await this.createSwapInstruction(
          wrappedSolAccount,
          userDestinationTokenAccount,
          wallets[0].publicKey,
          amounts[0] * LAMPORTS_PER_SOL
      );

      // Создаем транзакцию
      const swapTransaction = new Transaction().add(swapInstruction);

      // Устанавливаем fee payer
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('finalized');
      swapTransaction.recentBlockhash = blockhash;
      swapTransaction.lastValidBlockHeight = lastValidBlockHeight;
      swapTransaction.feePayer = wallets[0].publicKey;

      // Подписываем транзакцию
      swapTransaction.sign(wallets[0]);

      const simulationResult = await this.connection.simulateTransaction(swapTransaction);
    
      if (simulationResult.value.err) {
        console.error('Simulation error:', simulationResult.value.logs);
        return;
      }

      await sendAndConfirmTransaction(this.connection, swapTransaction, [wallets[0]]);
      } catch (error) {
        console.error('Ошибка при обмене через Raydium:', error);
      }
  }

  private async getOrCreateAssociatedTokenAccount(
    wallet: Keypair,
    mint: PublicKey
  ): Promise<PublicKey> {
    const associatedTokenAccount = await getAssociatedTokenAddress(
      mint,
      wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    try {
      await getAccount(this.connection, associatedTokenAccount);
    } catch {
      console.log(`Создаем токен-аккаунт для ${mint.toBase58()}...`);

      const { blockhash } = await this.connection.getLatestBlockhash("finalized");

      const transaction = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          associatedTokenAccount,
          wallet.publicKey,
          mint
        )
      );

      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = blockhash;

      transaction.sign(wallet);

      await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [wallet]
      );

      console.log(`Токен-аккаунт создан: ${associatedTokenAccount.toBase58()}`);
    }

    return associatedTokenAccount;
  }

  private async createSwapInstruction(
    sourceTokenAccount: PublicKey,
    destinationTokenAccount: PublicKey,
    userPublicKey: PublicKey,
    amount: number
  ): Promise<TransactionInstruction> {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error('Amount должен быть положительным целым числом.');
    }
  
    const SwapLayout = struct<{
      instructionType: number;
      amountIn: number;
    }>([
      u8('instructionType'), // Тип инструкции (1 для обмена)
      nu64('amountIn'),
    ]);
  
    const data = Buffer.alloc(SwapLayout.span);
  
    try {
      SwapLayout.encode(
        {
          instructionType: 1, // Код операции (например, 1 для обмена)
          amountIn: amount,
        },
        data
      );
    } catch (error) {
      throw error;
    }
  
      return new TransactionInstruction({
      programId: this.raydiumProgramId,
      keys: [
        { pubkey: sourceTokenAccount, isSigner: false, isWritable: true },
        { pubkey: destinationTokenAccount, isSigner: false, isWritable: true },
        { pubkey: userPublicKey, isSigner: true, isWritable: false },
      ],
      data,
    });
  }  
}
