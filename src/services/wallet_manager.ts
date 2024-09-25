// src/services/wallet_manager.ts

import { Keypair } from '@solana/web3.js';
import fs from 'fs';
import readlineSync from 'readline-sync';
import dotenv from 'dotenv';
import path from 'path';

// Загрузка переменных среды из файла .env
dotenv.config();

class WalletManager {
  private static BUNDLE_WALLET_PRIVATE_KEYS: string | undefined = process.env.BUNDLE_WALLET_PRIVATE_KEYS;

  // Метод для управления кошельками
  public static async manageWallets(): Promise<void> {
    if (this.BUNDLE_WALLET_PRIVATE_KEYS && this.BUNDLE_WALLET_PRIVATE_KEYS.trim() !== '') {
      const existingKeys = this.BUNDLE_WALLET_PRIVATE_KEYS.split(',').map(key => key.trim().replace(/^"|"$/g, ''));
      const existingKeysCount = existingKeys.length;

      if (existingKeysCount > 0) {
        try {
          const walletAddresses = existingKeys.map(key => {
            const keyBuffer = Buffer.from(key, 'hex');
            const wallet = Keypair.fromSecretKey(keyBuffer);
            return wallet.publicKey.toString();
          });

          console.log(`Найдено ${existingKeysCount} приватных ключей в файле .env.`);
          console.log('Адреса кошельков:');
          walletAddresses.forEach((address, index) => {
            console.log(`${index + 1}. ${address}`);
          });

          const useExistingKeys = readlineSync.question('Использовать существующие приватные ключи из .env? (да/нет): ').toLowerCase();

          if (useExistingKeys === 'да' || useExistingKeys === 'д') {
            console.log('Используем существующие приватные ключи.');
            return; 
          }
        } catch (error) {
          if (existingKeys.length > 0) {
            console.error('Ошибка при разборе существующих ключей: ключи недействительны.');
          }
          console.log('Кошельки не обнаружены. Переходим к созданию новых кошельков.');
        }
      } else {
        console.log('Приватных ключей в файле .env не обнаружено.');
      }
    } else {
      console.log('Приватных ключей в файле .env не обнаружено.');
    }

    const walletCountInput = readlineSync.question('Сколько кошельков создать? (по умолчанию 5): ');
    let walletCount = walletCountInput ? parseInt(walletCountInput) : 5;

    if (isNaN(walletCount) || walletCount <= 0) {
      console.log('Недопустимое количество кошельков. Используем значение по умолчанию: 5.');
      walletCount = 5;
    }
    
    const newPrivateKeys: string[] = [];

    for (let i = 0; i < walletCount; i++) {
      const newWallet = Keypair.generate();
      const hexKey = Buffer.from(newWallet.secretKey).toString('hex');
      newPrivateKeys.push(hexKey);
      console.log(`Создан новый кошелек: ${newWallet.publicKey.toString()}`);
    }

    this.updateEnvFile(newPrivateKeys.join(','));

    console.log('Новые приватные ключи были сгенерированы и сохранены в .env файл.');
  }

  // Метод для обновления файла .env
  private static updateEnvFile(newKeys: string): void {
    const envPath = path.resolve(__dirname, '../../.env');
    let envFileContent = fs.readFileSync(envPath, 'utf8');

    if (this.BUNDLE_WALLET_PRIVATE_KEYS) {
      // Комментируем старую строку с ключами
      const regex = /BUNDLE_WALLET_PRIVATE_KEYS=.*(\r?\n)?/g;
      envFileContent = envFileContent.replace(
        regex,
        `# BUNDLE_WALLET_PRIVATE_KEYS=${this.BUNDLE_WALLET_PRIVATE_KEYS}\n`
      );
    }

    // Добавляем новую строку с ключами
    if (envFileContent.includes('BUNDLE_WALLET_PRIVATE_KEYS=""')) {
      envFileContent = envFileContent.replace(
        `BUNDLE_WALLET_PRIVATE_KEYS=""`,
        `BUNDLE_WALLET_PRIVATE_KEYS="${newKeys}"`
      );
    } else {
      envFileContent += `\nBUNDLE_WALLET_PRIVATE_KEYS="${newKeys}"`;
    }

    // Записываем обновленный файл .env
    fs.writeFileSync(envPath, envFileContent);
  }
}

export default WalletManager;
