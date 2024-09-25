import { Keypair } from '@solana/web3.js';
import fs from 'fs/promises';
import readlineSync from 'readline-sync';
import dotenv from 'dotenv';
import path from 'path';

// Загрузка переменных среды из файла .env
dotenv.config();

class WalletManager {
  private static envPath = path.resolve(__dirname, '../../.env');
  private static DEFAULT_WALLET_COUNT = 5;
  private static YES_ANSWERS = ['да', 'д', 'y', 'yes', 'ya'];

  // Метод для управления кошельками
  public static async manageWallets(): Promise<void> {
    const BUNDLE_WALLET_PRIVATE_KEYS = this.getEnvVariable('BUNDLE_WALLET_PRIVATE_KEYS');
    if (BUNDLE_WALLET_PRIVATE_KEYS) {
      const existingKeys = this.parsePrivateKeys(BUNDLE_WALLET_PRIVATE_KEYS);

      if (existingKeys.length > 0) {
        const validKeys = this.getValidKeys(existingKeys);

        if (validKeys.length > 0) {
          this.displayWalletAddresses(validKeys);

          const useExistingKeys = readlineSync
            .question('Использовать существующие приватные ключи из .env? (да/нет): ')
            .toLowerCase();

          if (this.YES_ANSWERS.includes(useExistingKeys)) {
            console.log('Используем существующие приватные ключи.');
            return;
          }
        } else {
          console.log('Все существующие ключи недействительны. Переходим к созданию новых кошельков.');
        }
      } else {
        console.log('Приватных ключей в файле .env не обнаружено.');
      }
    } else {
      console.log('Приватных ключей в файле .env не обнаружено.');
    }

    await this.createNewWallets();
  }

  // Метод для получения значения переменной окружения
  private static getEnvVariable(variableName: string): string | null {
    const value = process.env[variableName];
    return value && value.trim() !== '' ? value : null;
  }

  // Метод для разбора приватных ключей
  private static parsePrivateKeys(keys: string): string[] {
    return keys.split(',')
      .map(key => key.trim().replace(/^"|"$/g, ''))
      .filter(key => key.length > 0);
  }

  // Метод для проверки валидности ключей
  private static getValidKeys(keys: string[]): string[] {
    return keys.filter(key => {
      try {
        const wallet = Keypair.fromSecretKey(Buffer.from(key, 'hex'));
        return wallet.secretKey.length > 0;
      } catch (error) {
        console.error('Недействительный ключ:', key);
        return false;
      }
    });
  }

  // Метод для отображения адресов кошельков
  private static displayWalletAddresses(keys: string[]): void {
    const walletAddresses = keys.map(key => {
      const wallet = Keypair.fromSecretKey(Buffer.from(key, 'hex'));
      return wallet.publicKey.toString();
    });

    console.log(`Найдено ${keys.length} действительных приватных ключей в файле .env.`);
    console.log('Адреса кошельков:');
    walletAddresses.forEach((address, index) => {
      console.log(`${index + 1}. ${address}`);
    });
  }

  // Метод для создания новых кошельков
  private static async createNewWallets(): Promise<void> {
    const walletCountInput = readlineSync.question(`Сколько кошельков создать? (по умолчанию ${this.DEFAULT_WALLET_COUNT}): `);
    let walletCount = walletCountInput ? parseInt(walletCountInput) : this.DEFAULT_WALLET_COUNT;

    if (isNaN(walletCount) || walletCount <= 0) {
      console.log(`Недопустимое количество кошельков. Используем значение по умолчанию: ${this.DEFAULT_WALLET_COUNT}.`);
      walletCount = this.DEFAULT_WALLET_COUNT;
    }

    const newPrivateKeys: string[] = [];

    for (let i = 0; i < walletCount; i++) {
      const newWallet = Keypair.generate();
      const hexKey = Buffer.from(newWallet.secretKey).toString('hex');
      newPrivateKeys.push(hexKey);
      console.log(`Создан новый кошелек: ${newWallet.publicKey.toString()}`);
    }

    await this.updateEnvFile(newPrivateKeys.join(','));
    console.log('Новые приватные ключи были сгенерированы и сохранены в .env файл.');

    // Обновляем значение переменной в process.env
    this.updateProcessEnvVariable('BUNDLE_WALLET_PRIVATE_KEYS', newPrivateKeys.join(','));
  }

  // Метод для обновления файла .env
  private static async updateEnvFile(newKeys: string): Promise<void> {
    try {
      let envFileContent = await fs.readFile(this.envPath, 'utf8');

      // Регулярное выражение для поиска активной строки
      const regex = /^(BUNDLE_WALLET_PRIVATE_KEYS=.*)$/gm;

      if (regex.test(envFileContent)) {
        // Комментируем старую строку
        envFileContent = envFileContent.replace(regex, `# $1`);
      }

      // Добавляем новую строку с ключами
      envFileContent += `\nBUNDLE_WALLET_PRIVATE_KEYS="${newKeys}"`;

      // Записываем обновленный файл .env
      await fs.writeFile(this.envPath, envFileContent);
    } catch (error) {
      console.error('Ошибка при обновлении файла .env:', error);
    }
  }

  // Метод для обновления переменной в process.env
  private static updateProcessEnvVariable(key: string, value: string): void {
    process.env[key] = value;
  }
}

export default WalletManager;
