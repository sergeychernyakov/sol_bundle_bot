// src/services/buy_coins.ts

import {
  Connection,
  PublicKey,
  Transaction,
  Signer,
  Keypair,
} from '@solana/web3.js';
import WalletManager from './wallet_manager';
import readlineSync from 'readline-sync';
import {
  Liquidity,
  LiquidityPoolKeysV4,
} from '@raydium-io/raydium-sdk';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import fetch from 'node-fetch';
import bs58 from 'bs58';
import BN from 'bn.js';
import dotenv from 'dotenv';

dotenv.config();

class BuyCoinsService {
  private connection: Connection;
  private walletManager: WalletManager;

  constructor(connection: Connection, walletManager: WalletManager) {
    this.connection = connection;
    this.walletManager = walletManager;
    console.log('BuyCoinsService initialized.');
  }

  private getMasterWallet(): Keypair | null {
    const masterWalletPrivateKey = this.walletManager.getEnvVariable('MASTER_WALLET_PRIVATE_KEY');
    if (!masterWalletPrivateKey) {
      console.error('Приватный ключ мастер-кошелька не найден.');
      return null;
    }
    
    try {
      const decodedMasterWalletPrivateKey = bs58.decode(masterWalletPrivateKey);
      return Keypair.fromSecretKey(decodedMasterWalletPrivateKey);
    } catch (error) {
      console.error('Ошибка при расшифровке мастер-кошелька:', error);
      return null;
    }
  }

  public async buyCoins(): Promise<void> {
    console.log('Starting buyCoins method.');

    const masterWallet = this.getMasterWallet();
    if (!masterWallet) {
      console.log('Мастер-кошелек не может быть использован.');
      return;
    }

    const totalAmountInput: string = readlineSync.question(
      'Введите общее количество токенов для покупки (по умолчанию 20000): '
    );
    const totalAmount: number = parseFloat(totalAmountInput) || 20000;
    console.log(`Total amount to buy: ${totalAmount}`);

    // Получаем список бандл-кошельков
    const wallets: Signer[] = this.walletManager.getValidWalletsKeys();
    console.log(`Number of wallets retrieved: ${wallets.length}`);

    if (wallets.length === 0) {
      console.log('Нет доступных кошельков для покупки.');
      return;
    }

    // Распределяем общее количество монет между кошельками
    const amounts: number[] = this.distributeAmount(totalAmount, wallets.length);
    console.log('Amounts distributed among wallets:', amounts);

    // Получаем адрес токена из переменных окружения
    const TOKEN_MINT_ADDRESS = this.walletManager.getEnvVariable('TOKEN_MINT_ADDRESS');
    if (!TOKEN_MINT_ADDRESS) {
      console.error('TOKEN_MINT_ADDRESS не установлен в файле .env.');
      return;
    }
    console.log(`Token mint address: https://explorer.solana.com/address/${TOKEN_MINT_ADDRESS}`);

    const tokenMint: PublicKey = new PublicKey(TOKEN_MINT_ADDRESS);

    // Адрес SOL токена
    const SOL_MINT: PublicKey = new PublicKey('So11111111111111111111111111111111111111112');

    // Получаем информацию о пуле Raydium
    console.log('Fetching pool keys...');
    const poolKeys: LiquidityPoolKeysV4 | null = await this.getPoolKeys(SOL_MINT, tokenMint);
    if (!poolKeys) {
      console.error('Не удалось получить информацию о пуле Raydium.');
      return;
    }
    console.log('Pool keys obtained.');

    // Массивы для хранения транзакций и соответствующих подписантов
    const transactions: Transaction[] = [];
    const transactionsSigners: Signer[][] = [];

    // Для каждого кошелька создаем транзакцию (без подписания)
    for (let i = 0; i < wallets.length; i++) {
      const wallet: Signer = wallets[i];
      const amountToBuy: number = amounts[i];

      try {
        console.log(`\nProcessing wallet ${i + 1}/${wallets.length}: ${wallet.publicKey.toString()}`);
        console.log(`Amount to buy (CHEESE): ${amountToBuy}`);

        // Создаем транзакцию свопа
        console.log('Creating swap transaction...');
        const { transaction, signers } = await this.createSwapTransaction(
          wallet.publicKey,
          poolKeys,
          amountToBuy
        );
        console.log('Swap transaction created.');

        // Сохраняем транзакцию и подписантов для последующего использования
        transactions.push(transaction);
        transactionsSigners.push([wallet, ...signers]);

      } catch (error) {
        console.error(`Ошибка при создании транзакции для кошелька ${wallet.publicKey.toString()}:`, error);
      }
    }

    // Выводим список транзакций и запрашиваем подтверждение
    console.log('\nСписок транзакций для отправки:');
    for (let i = 0; i < transactions.length; i++) {
      console.log(`Транзакция ${i + 1}:`);
      console.log(`Кошелёк: ${wallets[i].publicKey.toString()}`);
      console.log(`Сумма покупки (CHEESE): ${amounts[i]}`);
    }

    const confirmation = readlineSync.question('\nОтправить транзакции? (y/n): ');
    if (confirmation.toLowerCase() !== 'y') {
      console.log('Отправка транзакций отменена пользователем.');
      return;
    }

    // После подтверждения обновляем блокхеши, подписываем и сериализуем транзакции
    const signedTransactionsBase58: string[] = [];

    // Получаем новый блокхеш
    console.log('Fetching latest blockhash before sending transactions...');
    const latestBlockhash = await this.connection.getLatestBlockhash();
    console.log('Latest blockhash fetched.');

    for (let i = 0; i < transactions.length; i++) {
      try {
        const transaction = transactions[i];
        const signers = transactionsSigners[i];
    
        console.log(`Checking transaction ${i + 1} and its signers...`);
        if (!transaction) {
          console.error(`Transaction ${i + 1} is undefined.`);
          continue;
        }
        if (!signers || signers.length === 0) {
          console.error(`No signers found for transaction ${i + 1}.`);
          continue;
        }
    
        // Проверка подписантов
        for (let j = 0; j < signers.length; j++) {
          if (!signers[j] || !signers[j].publicKey) {
            console.error(`Signer ${j + 1} for transaction ${i + 1} is invalid or missing publicKey.`);
          } else {
            console.log(`Signer ${j + 1} for transaction ${i + 1}: ${signers[j].publicKey.toString()}`);
          }
        }
    
        // Проверка инструкций в транзакции
        console.log(`Checking instructions for transaction ${i + 1}...`);
        for (let k = 0; k < transaction.instructions.length; k++) {
          const instruction = transaction.instructions[k];
          if (!instruction || !instruction.programId || !instruction.keys) {
            console.error(`Instruction ${k + 1} for transaction ${i + 1} is undefined. Skipping...`);
            continue;
          }
    
          // Проверяем, что instruction.keys - это массив объектов с корректным publicKey
          if (!Array.isArray(instruction.keys) || instruction.keys.some(key => !key || !key.pubkey)) {
            console.error(`Instruction ${k + 1} has invalid keys.`);
            continue;
          }
    
          // Проверяем programId и keys
          if (!instruction.programId || !(instruction.programId instanceof PublicKey)) {
            console.error(`Instruction ${k + 1} has an invalid programId.`);
            continue;
          }

          if (!instruction.programId.toBase58) {
            console.error(`Instruction ${k + 1} has an invalid programId.`);
            continue;
          }
    
          // Выводим детальную информацию об инструкциях
          instruction.keys.forEach((key, index) => {
            if (!key.pubkey || !(key.pubkey instanceof PublicKey)) {
              console.error(`Key ${index + 1} in Instruction ${k + 1} is invalid.`);
            }
          });

          console.log(`Instruction ${k + 1} for transaction ${i + 1}: ${JSON.stringify(instruction)}`);
    
          console.log(`Instruction ${k + 1} for transaction ${i + 1} is valid.`);
        }
    
        // Установка параметров транзакции
        transaction.recentBlockhash = latestBlockhash.blockhash;
        transaction.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
        transaction.feePayer = signers[0].publicKey;
    
        console.log(`Transaction ${i + 1} details before signing:`);
        console.log(`  recentBlockhash: ${transaction.recentBlockhash}`);
        console.log(`  lastValidBlockHeight: ${transaction.lastValidBlockHeight}`);
        console.log(`  feePayer: ${transaction.feePayer?.toString()}`);
    
        // Подписываем транзакцию
        console.log(`Signing transaction ${i + 1}/${transactions.length}...`);
        transaction.partialSign(...signers);
        console.log('Transaction signed.');
    
        // Сериализация транзакции в base-58
        const serializedTx: Buffer = transaction.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        });
        const base58Tx: string = bs58.encode(serializedTx);
        console.log('Transaction serialized to base-58.');
    
        signedTransactionsBase58.push(base58Tx);
        console.log(`Transaction ${i + 1} added to the bundle.`);
      } catch (error) {
        console.error(`Ошибка при обработке транзакции ${i + 1}:`, error);
      }
    }

    // Отправляем пакет транзакций через sendBundle
    console.log('Sending transaction bundle...');
    await this.sendBundle(signedTransactionsBase58);
    console.log('Transaction bundle sent.');
  }

  private distributeAmount(totalAmount: number, numberOfWallets: number): number[] {
    console.log(`Distributing total amount ${totalAmount} among ${numberOfWallets} wallets.`);
    let randomNumbers: number[] = [];
    for (let i = 0; i < numberOfWallets; i++) {
      randomNumbers.push(Math.random());
    }
    console.log('Random numbers generated:', randomNumbers);

    const sum: number = randomNumbers.reduce((a, b) => a + b, 0);
    randomNumbers = randomNumbers.map((num) => num / sum);

    let amounts: number[] = randomNumbers.map((num) => num * totalAmount);

    amounts = amounts.map((num) => parseFloat(num.toFixed(6)));

    const adjustedAmounts: number[] = this.adjustAmounts(amounts, totalAmount);
    console.log('Adjusted amounts:', adjustedAmounts);

    return adjustedAmounts;
  }

  private adjustAmounts(amounts: number[], totalAmount: number): number[] {
    console.log('Adjusting amounts to match total amount.');
    const sum: number = amounts.reduce((a, b) => a + b, 0);
    const diff: number = totalAmount - sum;

    console.log(`Sum of amounts: ${sum}, Difference: ${diff}`);

    amounts[0] += diff;

    return amounts;
  }

  private async getPoolKeys(inputMint: PublicKey, outputMint: PublicKey): Promise<LiquidityPoolKeysV4 | null> {
    try {
      console.log('Fetching pool data from Raydium API...');
      const response = await fetch('https://api.raydium.io/v2/sdk/liquidity/mainnet.json');
      const data = await response.json();
      console.log('Pool data fetched.');

      // Проверяем наличие итерируемых свойств
      const officialPools = Array.isArray(data.official) ? data.official : [];
      const unOfficialPools = Array.isArray(data.unOfficial) ? data.unOfficial : [];
      const fusionPools = Array.isArray(data.fusion) ? data.fusion : []; // data.fusion может отсутствовать

      // Объединяем все существующие пулы в один массив
      const poolsData: any[] = [...officialPools, ...unOfficialPools, ...fusionPools];
      console.log('Combined poolsData length:', poolsData.length);

      // Находим пул, соответствующий нашим mint'ам
      const poolData = poolsData.find((pool) =>
        (pool.baseMint === inputMint.toBase58() && pool.quoteMint === outputMint.toBase58()) ||
        (pool.baseMint === outputMint.toBase58() && pool.quoteMint === inputMint.toBase58())
      );

      if (!poolData) {
        console.error('Не найден соответствующий пул для заданной пары токенов.');
        return null;
      }

      console.log('Matching pool data found.');

      // Преобразуем строковые адреса в PublicKey
      const poolKeys: LiquidityPoolKeysV4 = {
        id: new PublicKey(poolData.id),
        baseMint: new PublicKey(poolData.baseMint),
        quoteMint: new PublicKey(poolData.quoteMint),
        lpMint: new PublicKey(poolData.lpMint),
        version: poolData.version,
        programId: new PublicKey(poolData.programId),
        authority: new PublicKey(poolData.authority),
        openOrders: new PublicKey(poolData.openOrders),
        targetOrders: new PublicKey(poolData.targetOrders),
        baseVault: new PublicKey(poolData.baseVault),
        quoteVault: new PublicKey(poolData.quoteVault),
        lpVault: new PublicKey(poolData.lpVault),
        marketVersion: poolData.marketVersion || 3,
        marketProgramId: new PublicKey(poolData.marketProgramId),
        marketId: new PublicKey(poolData.marketId),
        marketBaseVault: new PublicKey(poolData.marketBaseVault),
        marketQuoteVault: new PublicKey(poolData.marketQuoteVault),
        marketBids: new PublicKey(poolData.marketBids),
        marketAsks: new PublicKey(poolData.marketAsks),
        marketEventQueue: new PublicKey(poolData.marketEventQueue),
        baseDecimals: poolData.baseDecimals,
        quoteDecimals: poolData.quoteDecimals,
        // Условно добавляем lookupTableAccount, если оно существует
        ...(poolData.lookupTableAccount && { lookupTableAccount: new PublicKey(poolData.lookupTableAccount) }),
      };

      console.log('Pool keys constructed.');

      return poolKeys;
    } catch (error) {
      console.error('Ошибка при получении информации о пуле:', error);
      return null;
    }
  }

  private async createSwapTransaction(
    userPublicKey: PublicKey,
    poolKeys: LiquidityPoolKeysV4,
    amountOut: number
  ): Promise<{ transaction: Transaction; signers: Signer[] }> {
    try {
      console.log('Starting createSwapTransaction method.');
      const transaction: Transaction = new Transaction();
      const signers: Signer[] = [];
  
      // Вычисляем количество токенов CHEESE в минимальных единицах (учитывая decimals)
      const amountOutUnits: BN = new BN(amountOut * Math.pow(10, poolKeys.quoteDecimals));
      console.log(`Desired amount out (CHEESE): ${amountOut}`);
      console.log(`Amount out in token units: ${amountOutUnits.toString()}`);
  
      // Получаем связанные аккаунты токенов
      console.log('Getting associated token addresses...');
      const userBaseTokenAccount: PublicKey = await getAssociatedTokenAddress(
        poolKeys.baseMint,
        userPublicKey
      );
  
      const userQuoteTokenAccount: PublicKey = await getAssociatedTokenAddress(
        poolKeys.quoteMint,
        userPublicKey
      );
  
      console.log('User base token account:', userBaseTokenAccount.toString());
      console.log('User quote token account:', userQuoteTokenAccount.toString());
  
      // Проверяем существование связанных аккаунтов токенов и создаём их при необходимости
      console.log('Checking if token accounts exist...');
      const userBaseTokenAccountInfo = await this.connection.getAccountInfo(userBaseTokenAccount);
      if (!userBaseTokenAccountInfo) {
        console.log('User base token account does not exist. Creating...');
        const createUserBaseTokenAccountIx = createAssociatedTokenAccountInstruction(
          userPublicKey,
          userBaseTokenAccount,
          userPublicKey,
          poolKeys.baseMint
        );
        transaction.add(createUserBaseTokenAccountIx);
      } else {
        console.log('User base token account exists.');
      }
  
      const userQuoteTokenAccountInfo = await this.connection.getAccountInfo(userQuoteTokenAccount);
      if (!userQuoteTokenAccountInfo) {
        console.log('User quote token account does not exist. Creating...');
        const createUserQuoteTokenAccountIx = createAssociatedTokenAccountInstruction(
          userPublicKey,
          userQuoteTokenAccount,
          userPublicKey,
          poolKeys.quoteMint
        );
        transaction.add(createUserQuoteTokenAccountIx);
      } else {
        console.log('User quote token account exists.');
      }
  
      // Создаём инструкции свопа, фиксируя количество входящих токенов
      console.log('Creating swap instructions...');
  
      const result = await Liquidity.makeSwapInstruction({
        poolKeys,
        userKeys: {
          tokenAccountIn: userBaseTokenAccount,
          tokenAccountOut: userQuoteTokenAccount,
          owner: userPublicKey,
        },
        amountIn: new BN(0),
        amountOut: amountOutUnits,
        fixedSide: 'out',
      });

      console.log('Result of makeSwapInstruction:', result);
      if (!result || !result.innerTransaction) {
        throw new Error('Некорректный результат makeSwapInstruction.');
      }

      const { instructions, signers: swapSigners } = result.innerTransaction;
      instructions.forEach((instruction, index) => {
        try {
          console.log(`Swap Instruction ${index + 1}:`);
          console.log(`  Program ID: ${instruction.programId.toBase58()}`);
      
          // Проверяем валидность ключей и фильтруем некорректные ключи
          const keys = instruction.keys.map(key => {
            if (!key.pubkey || typeof key.pubkey.toBase58 !== 'function') {
              console.error(`Invalid key detected at index ${index}. Skipping this instruction.`);
              return null;
            }
            return {
              pubkey: key.pubkey.toBase58(),
              isSigner: key.isSigner,
              isWritable: key.isWritable
            };
          }).filter(Boolean); // Удаляем null-значения
      
          if (keys.length === 0) {
            console.error(`Instruction ${index + 1} has no valid keys. Skipping this instruction.`);
            return;
          }
      
          console.log(`  Keys: ${JSON.stringify(keys)}`);
          console.log(`  Data: ${instruction.data.toString('hex')}`);
        } catch (err) {
          console.error(`Ошибка при логировании инструкции ${index + 1}:`, err);
        }
      });

      transaction.add(...instructions);
      signers.push(...swapSigners);
  
      console.log('Swap instructions added to transaction.');
      return { transaction, signers };
    } catch (error) {
      console.error('Error in createSwapTransaction:', error);
      throw error;
    }
  }

  private async sendBundle(transactionsBase58: string[]): Promise<void> {
    try {
      console.log('Starting sendBundle method.');
      // Проверяем, есть ли транзакции в бандле
      if (transactionsBase58.length === 0) {
        console.error('Нет транзакций для отправки в бандле.');
        return;
      }

      // URL RPC-сервера Jito Labs
      const rpcUrl: string = 'https://mainnet.block-engine.jito.wtf';

      console.log('Sending bundle to Jito Labs RPC server...');
      const response = await fetch(`${rpcUrl}/api/v1/bundles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'sendBundle',
          params: [transactionsBase58],
        }),
      });

      const result = await response.json();

      if (result.error) {
        console.error('Ошибка при отправке бандла:', result.error);
      } else {
        console.log('Бандл успешно отправлен. Bundle ID:', result.result);
      }
    } catch (error) {
      console.error('Ошибка при отправке бандла:', error);
    }
  }
}

export default BuyCoinsService;
