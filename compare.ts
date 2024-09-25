// src/bot.ts

import readlineSync from 'readline-sync';
import dotenv from 'dotenv';
import WalletManager from './services/wallet_manager'; // Импорт WalletManager

// Загрузка переменных среды из файла .env
dotenv.config();

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
    while (true) {
      console.log(`
      Пожалуйста, выберите действие (введите номер и нажмите Enter):
      ${MENU_OPTIONS.MANAGE_WALLETS}. Создать или использовать существующие кошельки
      ${MENU_OPTIONS.TOP_UP_WALLETS}. Пополнить кошельки
      ${MENU_OPTIONS.BUY_COINS}. Купить монеты
      ${MENU_OPTIONS.SELL_COINS}. Продать монеты
      ${MENU_OPTIONS.BUY_AND_SELL_COINS}. Купить и продать монеты
      ${MENU_OPTIONS.CLOSE_WALLETS}. Закрыть кошельки
      ${MENU_OPTIONS.EXIT}. Выйти
      `);

      const choice = readlineSync.questionInt('Ваш выбор: ');

      switch (choice) {
        case MENU_OPTIONS.MANAGE_WALLETS:
          await WalletManager.manageWallets();
          break;
        case MENU_OPTIONS.TOP_UP_WALLETS:
          await topUpWallets(); // Вызов функции пополнения кошельков
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

async function topUpWallets(): Promise<void> {
  console.log('Функция пополнения кошельков пока не реализована.');
}

async function closeWallets(): Promise<void> {
  console.log('Функция закрытия кошельков пока не реализована.');
}

// Запуск главного меню
mainMenu();