// src/services/wallet_manager.ts

import { Metaplex } from '@metaplex-foundation/js';
import { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs/promises';
import readlineSync from 'readline-sync';
import dotenv from 'dotenv';
import path from 'path';
import bs58 from 'bs58';

// Загрузка переменных среды из файла .env
dotenv.config();

class WalletManager {
  private envPath = path.resolve(__dirname, '../../.env');
  private DEFAULT_WALLET_COUNT = 5;
  private YES_ANSWERS = ['да', 'д', 'y', 'yes', 'ya'];
  private connection: Connection;
  private metaplex: Metaplex;

  constructor(connection: Connection) {
    this.connection = connection;
    this.metaplex = new Metaplex(connection);
  }

  // Метод для получения значения переменной окружения
  public getEnvVariable(variableName: string): string | null {
    const value = process.env[variableName];
    return value && value.trim() !== '' ? value : null;
  }

  // Метод для управления кошельками
  public async manageWallets(): Promise<void> {
    const BUNDLE_WALLET_PRIVATE_KEYS = this.getEnvVariable('BUNDLE_WALLET_PRIVATE_KEYS');
    if (BUNDLE_WALLET_PRIVATE_KEYS) {
      const validWallets = this.getValidWalletsKeys();

      if (validWallets.length > 0) {
        this.displayWalletAddresses(validWallets.map(wallet => bs58.encode(wallet.secretKey)));

        const useExistingKeys = readlineSync
          .question('Использовать существующие приватные ключи из .env? (да/нет): ')
          .toLowerCase();

        if (this.YES_ANSWERS.includes(useExistingKeys)) {
          console.log('Используем существующие приватные ключи.\n');
          return;
        }
      } else {
        console.log('Все существующие ключи недействительны. Переходим к созданию новых кошельков.');
      }
    } else {
      console.log('Приватных ключей в файле .env не обнаружено.');
    }

    await this.createNewWallets();
  }

  // Метод для получения валидных кошельков из переменной окружения
  public getValidWalletsKeys(): Keypair[] {
    const BUNDLE_WALLET_PRIVATE_KEYS = this.getEnvVariable('BUNDLE_WALLET_PRIVATE_KEYS');
    if (BUNDLE_WALLET_PRIVATE_KEYS) {
      const existingKeys = this.parsePrivateKeys(BUNDLE_WALLET_PRIVATE_KEYS);
      const validKeys = this.getValidKeys(existingKeys);

      // Используем bs58 декодирование для создания Keypair
      return validKeys.map(key => Keypair.fromSecretKey(bs58.decode(key)));
    }
    return [];
  }

  // Метод для разбора приватных ключей
  private parsePrivateKeys(keys: string): string[] {
    return keys.split(',')
      .map(key => key.trim().replace(/^"|"$/g, ''))
      .filter(key => key.length > 0);
  }

  // Метод для проверки валидности ключей
  private getValidKeys(keys: string[]): string[] {
    const validKeys = keys.filter(key => {
      try {
        // Используем bs58 декодирование для проверки ключа
        const wallet = Keypair.fromSecretKey(bs58.decode(key));
        return wallet.secretKey.length > 0;
      } catch (error) {
        console.error('Недействительный ключ:', key);
        return false;
      }
    });

    return validKeys;
  }

  // Метод для отображения адресов кошельков
  private displayWalletAddresses(keys: string[]): void {
    const walletAddresses = keys.map(key => {
      // Декодируем ключи из base58
      const wallet = Keypair.fromSecretKey(bs58.decode(key));
      return wallet.publicKey.toString();
    });

    console.log(`Найдено ${keys.length} действительных приватных ключей в файле .env.`);
    console.log('Адреса кошельков:');
    walletAddresses.forEach((address, index) => {
      console.log(`${index + 1}. https://explorer.solana.com/address/${address}`);
    });
  }

  // Метод для отображения адреса мастер-кошелька
  public async displayMasterWallet(): Promise<void> {
    const masterWalletPrivateKey = this.getEnvVariable('MASTER_WALLET_PRIVATE_KEY');
    const tokenMintAddress = this.getEnvVariable('TOKEN_MINT_ADDRESS');

    if (!masterWalletPrivateKey) {
      console.log('Приватный ключ MASTER_WALLET_PRIVATE_KEY не задан в .env файле.');
      return;
    }

    if (masterWalletPrivateKey.length !== 88) {
      throw new Error(`Invalid secret key length: ${masterWalletPrivateKey.length} bytes`);
    }

    try {
      // Декодирование ключа из base58
      const decodedMasterWalletPrivateKey = bs58.decode(masterWalletPrivateKey);
      const masterWallet = Keypair.fromSecretKey(decodedMasterWalletPrivateKey);
      const masterWalletPublicKey = masterWallet.publicKey.toString();

      console.log(`MASTER_WALLET: https://explorer.solana.com/address/${masterWalletPublicKey}`);

      // Используем существующий метод для получения баланса
      await this.getWalletBalance(masterWalletPublicKey);
      if (tokenMintAddress) {
        await this.getTokenBalance(new PublicKey(masterWalletPublicKey), tokenMintAddress);
      } else {
        console.log('Адрес токена не найден в переменных окружения.');
      }

    } catch (error) {
      console.error('Ошибка при создании MASTER_WALLET из приватного ключа:', error);
    }
  }

  // Метод для создания новых кошельков
  private async createNewWallets(): Promise<void> {
    const walletCountInput = readlineSync.question(`Сколько кошельков создать? (по умолчанию ${this.DEFAULT_WALLET_COUNT}): `);
    let walletCount = walletCountInput ? parseInt(walletCountInput) : this.DEFAULT_WALLET_COUNT;

    if (isNaN(walletCount) || walletCount <= 0) {
      console.log(`Недопустимое количество кошельков. Используем значение по умолчанию: ${this.DEFAULT_WALLET_COUNT}.`);
      walletCount = this.DEFAULT_WALLET_COUNT;
    }

    const newPrivateKeys: string[] = [];

    for (let i = 0; i < walletCount; i++) {
      const newWallet = Keypair.generate();
      // Сохраняем ключи в формате base58
      const base58Key = bs58.encode(newWallet.secretKey);
      newPrivateKeys.push(base58Key);
      console.log(`Создан новый кошелек: ${newWallet.publicKey.toString()}`);
    }

    await this.updateEnvFile(newPrivateKeys.join(','));
    console.log('Новые приватные ключи были сгенерированы и сохранены в .env файл.');

    // Обновляем значение переменной в process.env
    this.updateProcessEnvVariable('BUNDLE_WALLET_PRIVATE_KEYS', newPrivateKeys.join(','));
  }

  // Метод для обновления файла .env
  private async updateEnvFile(newKeys: string): Promise<void> {
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
  private updateProcessEnvVariable(key: string, value: string): void {
    process.env[key] = value;
  }

  // Метод для получения метаданных токена
  private async getTokenMetadata(tokenMintAddress: string): Promise<string | null> {
    try {
      const mintPublicKey = new PublicKey(tokenMintAddress);

      const metadata = await this.metaplex.nfts().findByMint({ mintAddress: mintPublicKey });

      return metadata.name; // Возвращаем имя токена
    } catch (error) {
      console.error('Ошибка при получении метаданных токена:', error);
      return null;
    }
  }

  // Метод для получения баланса SOL и торгового токена
  public async getWalletBalance(walletAddress: string): Promise<void> {
    try {
      const publicKey = new PublicKey(walletAddress);

      // Получаем баланс в SOL
      const solBalance = await this.connection.getBalance(publicKey);
      console.log(`Баланс SOL: ${solBalance / LAMPORTS_PER_SOL}`);
    } catch (error: any) {
      console.error(`Ошибка при получении баланса кошелька ${walletAddress}: ${error.message}`);
      console.error('Детали ошибки:', error);
    }
  }

  // Метод для получения баланса торгового токена с именем токена
  private async getTokenBalance(walletPublicKey: PublicKey, tokenMintAddress: string): Promise<void> {
    try {
      const tokenPublicKey = new PublicKey(tokenMintAddress);

      // Получаем все аккаунты токенов, связанных с данным кошельком
      const tokenAccounts = await this.connection.getTokenAccountsByOwner(walletPublicKey, {
        mint: tokenPublicKey,
      });

      // Получаем имя токена
      const tokenName = await this.getTokenMetadata(tokenMintAddress) || 'Неизвестный токен';

      // Суммируем баланс по всем аккаунтам этого токена
      let totalBalance = 0;
      for (const tokenAccount of tokenAccounts.value) {
        const accountInfo = await this.connection.getParsedAccountInfo(tokenAccount.pubkey);

        // Проверяем, что данные содержат информацию о токене
        if (accountInfo.value && 'parsed' in accountInfo.value.data) {
          const balance = accountInfo.value.data.parsed.info.tokenAmount.uiAmount;
          totalBalance += balance || 0;
        }
      }

      console.log(`Баланс ${tokenName}: ${totalBalance}`);
    } catch (error) {
      console.error('Ошибка при получении баланса токена:', error);
    }
  }
}

export default WalletManager;
