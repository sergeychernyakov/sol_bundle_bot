// src/bot.ts

import readlineSync from 'readline-sync';
import dotenv from 'dotenv';
import WalletManager from './services/wallet_manager'; // Импорт WalletManager

// Загрузка переменных среды из файла .env
dotenv.config();

// Основное меню
async function mainMenu(): Promise<void> {
  while (true) {
    console.log(`
    Пожалуйста, выберите действие (введите номер и нажмите Enter):
    1. Создать или использовать существующие кошельки
    2. Купить монеты
    3. Продать монеты
    4. Купить и продать монеты
    5. Закрыть кошельки
    6. Выйти
    `);

    const choice = readlineSync.questionInt('Ваш выбор: ');

    switch (choice) {
      case 1:
        await WalletManager.manageWallets(); // Вызов метода управления кошельками
        break;
      case 2:
        buyCoins();
        break;
      case 3:
        sellCoins();
        break;
      case 4:
        buyAndSellCoins();
        break;
      case 5:
        closeWallets();
        break;
      case 6:
        console.log('До свидания!');
        process.exit();
        break;
      default:
        console.log('Неизвестное действие. Пожалуйста, выберите снова.');
    }
  }
}

// Вспомогательные функции (заглушки)
function buyCoins(): void {
  console.log('Функция покупки монет пока не реализована.');
}

function sellCoins(): void {
  console.log('Функция продажи монет пока не реализована.');
}

function buyAndSellCoins(): void {
  console.log('Функция покупки и продажи монет пока не реализована.');
}

function closeWallets(): void {
  console.log('Функция закрытия кошельков пока не реализована.');
}

// Запуск главного меню
mainMenu();
