// src/services/wallet_top_up.ts

import { Connection, LAMPORTS_PER_SOL, Transaction, SystemProgram, Keypair, sendAndConfirmTransaction, BlockhashWithExpiryBlockHeight } from '@solana/web3.js';
import readlineSync from 'readline-sync';
import WalletManager from './wallet_manager'; // Импорт WalletManager
import bs58 from 'bs58';

class WalletTopUp {
  private connection: Connection;
  private walletManager: WalletManager;

  constructor(connection: Connection, walletManager: WalletManager) {
    this.connection = connection;
    this.walletManager = walletManager;
  }

  // Метод для получения последнего blockhash с ретраями
  private async getLatestBlockhashWithRetries(maxRetries = 7, delay = 10000): Promise<BlockhashWithExpiryBlockHeight> {
    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        return await this.connection.getLatestBlockhash();
      } catch (error: any) {
        attempts++;
        if (error.message.includes('429')) {
          const retryAfter = delay * attempts;
          console.error(`Превышен лимит запросов. Повтор через ${retryAfter} мс...`);
          await new Promise(res => setTimeout(res, retryAfter));
          delay *= 2; // Увеличиваем задержку экспоненциально
        } else {
          // console.error(`Ошибка при получении blockhash (попытка ${attempts}):`);
          if (attempts >= maxRetries) {
            throw error;
          }
          await new Promise(res => setTimeout(res, delay));
        }
      }
    }
    throw new Error('Не удалось получить blockhash после нескольких попыток');
  }

  // Метод для пополнения кошельков
  public async topUpWallets(): Promise<void> {
    // Получение валидных кошельков из WalletManager
    const wallets = this.walletManager.getValidWalletsKeys();
    if (wallets.length === 0) {
      console.log('Нет доступных кошельков для пополнения.');
      return;
    }

    // Получаем мастер-кошелек для отправки SOL
    const masterWalletPrivateKey = this.walletManager.getEnvVariable('MASTER_WALLET_PRIVATE_KEY');
    if (!masterWalletPrivateKey) {
      console.error('Приватный ключ мастер-кошелька не найден.');
      return;
    }
    const decodedMasterWalletPrivateKey = bs58.decode(masterWalletPrivateKey);
    const masterWallet = Keypair.fromSecretKey(decodedMasterWalletPrivateKey);

    // Запрос количества SOL для пополнения, по умолчанию 0.01
    const solAmountInput = readlineSync.question(
      'Введите количество SOL для пополнения кошельков (по умолчанию 0.01): '
    );
    const solAmount = parseFloat(solAmountInput) || 0.01;

    // Подтверждение операции
    const confirmation = readlineSync.question(
      `Вы уверены, что хотите пополнить ${wallets.length} кошельков на ${solAmount} SOL? (да/нет): `
    ).toLowerCase();

    if (!['да', 'д', 'y', 'yes'].includes(confirmation)) {
      console.log('Операция отменена.');
      return;
    }

    // Выполнение операции пополнения для каждого кошелька
    for (const wallet of wallets) {
      try {
        // Получаем новый blockhash для каждой транзакции
        let blockhashInfo: BlockhashWithExpiryBlockHeight;
        try {
          blockhashInfo = await this.getLatestBlockhashWithRetries();
        } catch (error) {
          console.error('Не удалось получить blockhash:', error);
          continue; // Переходим к следующему кошельку
        }

        // Создание транзакции
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: masterWallet.publicKey,
            toPubkey: wallet.publicKey,
            lamports: solAmount * LAMPORTS_PER_SOL,
          })
        );

        // Устанавливаем blockhash и feePayer
        transaction.recentBlockhash = blockhashInfo.blockhash;
        transaction.lastValidBlockHeight = blockhashInfo.lastValidBlockHeight;
        transaction.feePayer = masterWallet.publicKey;

        // Подписание и отправка транзакции
        const signature = await sendAndConfirmTransaction(
          this.connection,
          transaction,
          [masterWallet]
        );

        console.log(`Кошелек ${wallet.publicKey.toString()} пополнен на ${solAmount} SOL. Транзакция: https://explorer.solana.com/tx/${signature}`);

        // Добавляем задержку между транзакциями
        await new Promise(res => setTimeout(res, 5000));

      } catch (error) {
        console.error(`Ошибка при пополнении кошелька ${wallet.publicKey.toString()}:`, error);
      }
    }
  }
}

export default WalletTopUp;
