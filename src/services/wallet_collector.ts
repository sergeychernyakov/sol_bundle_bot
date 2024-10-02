// src/services/wallet_collector.ts

import { Connection, LAMPORTS_PER_SOL, Transaction, SystemProgram, Keypair, sendAndConfirmTransaction, PublicKey } from '@solana/web3.js';
import WalletManager from './wallet_manager';
import readlineSync from 'readline-sync';
import bs58 from 'bs58';

class WalletCollector {
  private connection: Connection;
  private walletManager: WalletManager;

  constructor(connection: Connection, walletManager: WalletManager) {
    this.connection = connection;
    this.walletManager = walletManager;
  }

  // Метод для получения баланса с ретраями
  private async getBalanceWithRetries(publicKey: PublicKey, maxRetries = 5, delay = 1000): Promise<number> {
    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        const balanceLamports = await this.connection.getBalance(publicKey);
        return balanceLamports;
      } catch (error) {
        attempts++;
        // console.error(`Ошибка при получении баланса кошелька ${publicKey.toString()} (попытка ${attempts}):`, error);
        if (attempts >= maxRetries) {
          throw error;
        }
        await new Promise(res => setTimeout(res, delay));
      }
    }
    throw new Error(`Не удалось получить баланс кошелька ${publicKey.toString()} после ${maxRetries} попыток`);
  }

  // Метод для закрытия кошельков
  public async closeWallets(): Promise<void> {
    try {
      // Получаем валидные кошельки из WalletManager
      const wallets = this.walletManager.getValidWalletsKeys();
      if (wallets.length === 0) {
        console.log('Нет доступных кошельков для закрытия.');
        return;
      }

      // Выводим балансы всех кошельков
      let totalBalance = 0;
      console.log('Балансы кошельков:');
      for (const wallet of wallets) {
        try {
          const balanceLamports = await this.getBalanceWithRetries(wallet.publicKey);
          const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;
          totalBalance += balanceSOL;
          console.log(`Кошелек: ${wallet.publicKey.toString()}, Баланс: ${balanceSOL} SOL`);
          // Добавляем задержку
          await new Promise(res => setTimeout(res, 200)); // Задержка 200 мс
        } catch (error) {
          console.error(`Не удалось получить баланс кошелька ${wallet.publicKey.toString()}:`, error);
        }
      }

      console.log(`Общий баланс всех кошельков: ${totalBalance} SOL`);

      if (totalBalance === 0) {
        return;
      }

      // Спрашиваем подтверждение на сбор всех SOL
      const collectConfirmation = readlineSync.question(
        'Вы хотите собрать все SOL на мастер-кошелек? (да/нет): '
      ).toLowerCase();

      if (['да', 'д', 'y', 'yes'].includes(collectConfirmation)) {
        // Получаем мастер-кошелек
        const masterWalletPrivateKey = this.walletManager.getEnvVariable('MASTER_WALLET_PRIVATE_KEY');
        if (!masterWalletPrivateKey) {
          console.error('Приватный ключ мастер-кошелька не найден.');
          return;
        }
        const decodedMasterWalletPrivateKey = bs58.decode(masterWalletPrivateKey);
        const masterWallet = Keypair.fromSecretKey(decodedMasterWalletPrivateKey);

        // Для каждого кошелька переводим SOL на мастер-кошелек
        for (const wallet of wallets) {
          try {
            const balanceLamports = await this.getBalanceWithRetries(wallet.publicKey);
            if (balanceLamports > 0) {
              // Вычисляем сумму для перевода, оставляем немного для комиссии
              const lamportsToSend = balanceLamports - 5000; // 5000 лампортов на комиссию
              if (lamportsToSend <= 0) {
                console.log(`Недостаточно средств для перевода с кошелька ${wallet.publicKey.toString()}.`);
                continue;
              }

              // Создаем транзакцию для перевода
              const transaction = new Transaction().add(
                SystemProgram.transfer({
                  fromPubkey: wallet.publicKey,
                  toPubkey: masterWallet.publicKey,
                  lamports: lamportsToSend,
                })
              );

              // Подписываем и отправляем транзакцию
              const signature = await sendAndConfirmTransaction(
                this.connection,
                transaction,
                [wallet]
              );

              console.log(`Кошелек ${wallet.publicKey.toString()} перевел ${(lamportsToSend / LAMPORTS_PER_SOL).toFixed(6)} SOL на мастер-кошелек. Транзакция: https://explorer.solana.com/tx/${signature}`);

              // Добавляем задержку между транзакциями
              await new Promise(res => setTimeout(res, 500)); // Задержка 500 мс
            } else {
              console.log(`Кошелек ${wallet.publicKey.toString()} имеет нулевой баланс.`);
            }
          } catch (error) {
            console.error(`Ошибка при переводе с кошелька ${wallet.publicKey.toString()}:`, error);
          }
        }
      } else {
        console.log('Сбор SOL отменен.');
      }

    } catch (error) {
      console.error('Произошла ошибка при закрытии кошельков:', error);
    }
  }
}

export default WalletCollector;
