import readlineSync from 'readline-sync';
import dotenv from 'dotenv';
import WalletManager from './services/wallet_manager'; // Импорт WalletManager
import WalletTopUp from './services/wallet_top_up'; // Импорт WalletTopUp
import WalletCollector from './services/wallet_collector'; // Импорт WalletCollector
import { Connection } from '@solana/web3.js'; // Импорт необходимых компонентов Solana Web3.js
import { buyBundle } from "./services/buy_tokens";
import { createWalletSells } from './services/sell_tokens_service';
import { buyAndSellTokens } from './services/buy_and_sell_tokens_service'

// Загрузка переменных среды из файла .env
dotenv.config();

// Константы для выбора меню
const MENU_OPTIONS = {
  MANAGE_WALLETS: 1,
  TOP_UP_WALLETS: 2,
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

      // Загрузка переменных среды из файла .env
      dotenv.config();

      // Создание соединения с сетью Solana
      // Получаем API-ключ из переменных окружения
      const QUICK_NODE_API_KEY = process.env.QUICK_NODE_API_KEY;
      if (!QUICK_NODE_API_KEY) {
        console.error('QUICK_NODE_API_KEY не установлен в файле .env.');
        return;
      }

      // Формируем URL для подключения к QuickNode
      const quickNodeUrl = `https://necessary-light-shape.solana-mainnet.quiknode.pro/${QUICK_NODE_API_KEY}/`;

      // Создание соединения с QuickNode RPC-сервером
      const connection = new Connection(quickNodeUrl, 'confirmed');

      // Создаем экземпляр WalletManager и передаем соединение
      const walletManager = new WalletManager(connection);

      const walletTopUp = new WalletTopUp(connection, walletManager); // Передаем walletManager в WalletTopUp
      const walletCollector = new WalletCollector(connection, walletManager); // Создаем экземпляр WalletCollector

      await walletManager.displayMasterWallet(); // Используем экземпляр walletManager

      console.log(`
      Пожалуйста, выберите действие (введите номер и нажмите Enter):

      ${MENU_OPTIONS.MANAGE_WALLETS}. Создать кошельки
      ${MENU_OPTIONS.TOP_UP_WALLETS}. Пополнить кошельки
      ${MENU_OPTIONS.BUY_COINS}. Купить монеты (бандл)
      ${MENU_OPTIONS.SELL_COINS}. Продать монеты (бандл)
      ${MENU_OPTIONS.BUY_AND_SELL_COINS}. Купить и продать монеты (бандл)
      ${MENU_OPTIONS.CLOSE_WALLETS}. Собрать SOL с кошельков
      ${MENU_OPTIONS.EXIT}. Выйти
      `);

      const choice = readlineSync.questionInt('Ваш выбор: ');

      switch (choice) {
        case MENU_OPTIONS.MANAGE_WALLETS:
          await walletManager.manageWallets();
          break;
        case MENU_OPTIONS.TOP_UP_WALLETS:
          await walletTopUp.topUpWallets();
          break;
        case MENU_OPTIONS.BUY_COINS:
          await buyBundle();
          break;
        case MENU_OPTIONS.SELL_COINS:
          await createWalletSells();
          break;
        case MENU_OPTIONS.BUY_AND_SELL_COINS:
          await buyAndSellTokens();
          break;
        case MENU_OPTIONS.CLOSE_WALLETS:
          await walletCollector.closeWallets();
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

// Запуск главного меню
mainMenu();
