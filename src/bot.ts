// src/bot.ts

import readlineSync from 'readline-sync';
import dotenv from 'dotenv';
import WalletManager from './services/wallet_manager'; // Импорт WalletManager
import WalletTopUp from './services/wallet_top_up'; // Импорт WalletTopUp
import { Connection, clusterApiUrl } from '@solana/web3.js'; // Импорт необходимых компонентов Solana Web3.js

// Загрузка переменных среды из файла .env
dotenv.config();

// Создание соединения с сетью Solana
const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed'); // Используем основную сеть

// Константы для выбора меню
const MENU_OPTIONS = {
  MANAGE_WALLETS: 1,
  TOP_UP_WALLETS: 2, // Пополнение кошельков теперь на втором месте
  BUY_COINS: 3,
  SELL_COINS: 4,
  BUY_AND_SELL_COINS: 5,
  CLOSE_WALLETS: 6,
  EXIT: 7,
};

// Основное меню
async function mainMenu(): Promise<void> {
  try {
    const walletTopUp = new WalletTopUp(connection); // Создание экземпляра WalletTopUp

    while (true) {
      await WalletManager.displayMasterWallet(); // Вызов метода для отображения мастер-кошелька

      console.log(`
      Пожалуйста, выберите действие (введите номер и нажмите Enter):

      ${MENU_OPTIONS.MANAGE_WALLETS}. Создать кошельки
      ${MENU_OPTIONS.TOP_UP_WALLETS}. Пополнить кошельки
      ${MENU_OPTIONS.BUY_COINS}. Купить монеты (бандл)
      ${MENU_OPTIONS.SELL_COINS}. Продать монеты (бандл)
      ${MENU_OPTIONS.BUY_AND_SELL_COINS}. Купить и продать монеты (бандл)
      ${MENU_OPTIONS.CLOSE_WALLETS}. Закрыть кошельки
      ${MENU_OPTIONS.EXIT}. Выйти
      `);

      const choice = readlineSync.questionInt('Ваш выбор: ');

      switch (choice) {
        case MENU_OPTIONS.MANAGE_WALLETS:
          await WalletManager.manageWallets();
          break;
        case MENU_OPTIONS.TOP_UP_WALLETS:
          await walletTopUp.topUpWallets(); // Вызов метода popолнения кошельков
          break;
        case MENU_OPTIONS.BUY_COINS:
          await buyCoins(); // Вызов функции покупки монет
          break;
        case MENU_OPTIONS.SELL_COINS:
          await sellCoins(); // Вызов функции продажи монет
          break;
        case MENU_OPTIONS.BUY_AND_SELL_COINS:
          await buyAndSellCoins(); // Вызов функции покупки и продажи монет
          break;
        case MENU_OPTIONS.CLOSE_WALLETS:
          await closeWallets(); // Вызов функции закрытия кошельков
          break;
        case MENU_OPTIONS.EXIT:
          const exitConfirmation = readlineSync
            .question('Вы уверены, что хотите выйти? (да/нет): ')
            .toLowerCase();
          if (['да', 'д', 'y', 'yes', 'ya'].includes(exitConfirmation)) {
            console.log('До свидания!');
            process.exit();
          }
          break;
        default:
          console.log('Неизвестное действие. Пожалуйста, выберите снова.');
      }
    }
  } catch (error) {
    console.error('Произошла ошибка в главном меню:', error);
  }
}

// Вспомогательные функции (асинхронные заглушки)
async function buyCoins(): Promise<void> {
  console.log('Функция покупки монет пока не реализована.');
}

async function sellCoins(): Promise<void> {
  console.log('Функция продажи монет пока не реализована.');
}

async function buyAndSellCoins(): Promise<void> {
  console.log('Функция покупки и продажи монет пока не реализована.');
}

async function closeWallets(): Promise<void> {
  console.log('Функция закрытия кошельков пока не реализована.');
}

// Запуск главного меню
mainMenu();
