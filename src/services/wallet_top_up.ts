// src/services/wallet_top_up.ts

import { Connection, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import readlineSync from 'readline-sync';
import WalletManager from './wallet_manager'; // Импорт WalletManager для использования методов получения кошельков

class WalletTopUp {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  // Метод для пополнения кошельков
  public async topUpWallets(): Promise<void> {
    // Получение валидных кошельков из WalletManager
    const wallets = WalletManager.getValidWalletsKeys(); // Получение списка валидных кошельков
    if (wallets.length === 0) {
      console.log('Нет доступных кошельков для пополнения.');
      return;
    }

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
        // Создание транзакции для пополнения кошелька
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: wallet.publicKey, // Здесь нужно указать целевой кошелек
            lamports: solAmount * LAMPORTS_PER_SOL,
          })
        );

        // Подписание и отправка транзакции
        const signature = await this.connection.sendTransaction(transaction, [wallet]);
        console.log(`Кошелек ${wallet.publicKey.toString()} пополнен на ${solAmount} SOL. Транзакция: https://explorer.solana.com/tx/${signature}`);
      } catch (error) {
        console.error(`Ошибка при пополнении кошелька ${wallet.publicKey.toString()}:`, error);
      }
    }
  }
}

export default WalletTopUp;
