// src/services/buy_coins_service.ts

import {
  Connection,
  PublicKey,
  Transaction,
  Signer,
  Keypair,
  SystemProgram,
} from '@solana/web3.js';
import WalletManager from './wallet_manager';
import readlineSync from 'readline-sync';
import {
  Liquidity,
  LiquidityPoolKeysV4,
  Token,
  TokenAmount,
  Percent,
} from '@raydium-io/raydium-sdk';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  createCloseAccountInstruction,
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
    const wallets: Keypair[] = this.walletManager.getValidWalletsKeys();
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

    // Адрес WSOL токена
    const WSOL_MINT: PublicKey = new PublicKey('So11111111111111111111111111111111111111112');

    // Получаем информацию о пуле Raydium
    console.log('Fetching pool keys...');
    const poolKeys: LiquidityPoolKeysV4 | null = await this.getPoolKeys(WSOL_MINT, tokenMint);
    if (!poolKeys) {
      console.error('Не удалось получить информацию о пуле Raydium.');
      return;
    }
    console.log('Pool keys obtained.');

    // Создаём объекты Token для CHEESE и WSOL
    const baseToken = new Token(
      poolKeys.baseMint,
      poolKeys.baseDecimals,
      undefined,
      'CHEESE'
    );

    const quoteToken = new Token(
      poolKeys.quoteMint,
      poolKeys.quoteDecimals,
      undefined,
      'WSOL'
    );

    // Получаем информацию о пуле (балансы, цены и т.д.)
    const poolInfo = await Liquidity.fetchInfo({
      connection: this.connection,
      poolKeys,
    });

    // Массивы для хранения транзакций и соответствующих подписантов
    const transactions: Transaction[] = [];
    const transactionsSigners: Signer[][] = [];
    const estimatedSolCosts: number[] = []; // Массив для хранения оценочных затрат SOL

    let totalEstimatedSol = 0; // Переменная для суммарной стоимости SOL

    // Для каждого кошелька создаем транзакцию (без подписания)
    for (let i = 0; i < wallets.length; i++) {
      const wallet: Keypair = wallets[i];
      const amountToBuy: number = amounts[i];

      try {
        console.log(`\nProcessing wallet ${i + 1}/${wallets.length}: ${wallet.publicKey.toString()}`);
        console.log(`Amount to buy (CHEESE): ${amountToBuy}`);

        // Рассчитываем количество SOL, необходимое для покупки amountToBuy CHEESE
        const estimatedSol = await this.estimateSolNeeded(
          poolKeys,
          poolInfo,
          amountToBuy,
          baseToken,
          quoteToken
        );
        console.log(`Estimated SOL needed for wallet ${wallet.publicKey.toString()}: ${estimatedSol.toFixed(6)} SOL`);
        estimatedSolCosts.push(estimatedSol);
        totalEstimatedSol += estimatedSol;

        // Создаем транзакцию свопа
        console.log('Creating swap transaction...');
        const { transaction, signers } = await this.createSwapTransaction(
          wallet,
          poolKeys,
          amountToBuy,
          baseToken,
          quoteToken
        );
        console.log('Swap transaction created.');

        // Сохраняем транзакцию и подписантов для последующего использования
        transactions.push(transaction);
        transactionsSigners.push(signers);

      } catch (error) {
        console.error(`Ошибка при создании транзакции для кошелька ${wallet.publicKey.toString()}:`, error);
      }
    }

    // Выводим общую оценочную стоимость SOL
    console.log(`\nTotal estimated SOL needed for all transactions: ${totalEstimatedSol.toFixed(6)} SOL`);

    // Выводим список транзакций и запрашиваем подтверждение
    console.log('\nСписок транзакций для отправки:');
    for (let i = 0; i < transactions.length; i++) {
      console.log(`Транзакция ${i + 1}:`);
      console.log(`Кошелёк: ${wallets[i].publicKey.toString()}`);
      console.log(`Сумма покупки (CHEESE): ${amounts[i]}`);
      console.log(`Оценочная стоимость SOL: ${estimatedSolCosts[i].toFixed(6)} SOL`);
    }

    const confirmation = readlineSync.question('\nОтправить транзакции? (y/n): ');
    if (!['да', 'д', 'y', 'yes'].includes(confirmation.toLowerCase())) {
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
    
        // Установка параметров транзакции
        transaction.recentBlockhash = latestBlockhash.blockhash;
        transaction.feePayer = signers[0].publicKey;

        console.log(`Transaction ${i + 1} details before signing:`);
        console.log(`  recentBlockhash: ${transaction.recentBlockhash}`);
        console.log(`  feePayer: ${transaction.feePayer?.toString()}`);

        // Подписываем транзакцию
        console.log(`Signing transaction ${i + 1}/${transactions.length}...`);
        transaction.sign(...signers as Keypair[]);
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

  private async estimateSolNeeded(
    poolKeys: LiquidityPoolKeysV4,
    poolInfo: any,
    amountOut: number,
    baseToken: Token,
    quoteToken: Token
  ): Promise<number> {
    // Создаём TokenAmount для amountOutUnits
    const amountOutUnits = new TokenAmount(
      baseToken,
      (amountOut * Math.pow(10, baseToken.decimals)).toFixed(0)
    );

    // Используем функцию SDK для расчёта необходимого amountIn
    const { amountIn } = Liquidity.computeAmountIn({
      poolKeys,
      poolInfo,
      amountOut: amountOutUnits,
      currencyOut: baseToken,
      currencyIn: quoteToken,
      slippage: new Percent(0, 100), // 0% проскальзывание
    });

    // Преобразуем amountIn из TokenAmount в число SOL
    const amountInSol = parseFloat(amountIn.toExact());

    return amountInSol;
  }

  private async createSwapTransaction(
    wallet: Keypair,
    poolKeys: LiquidityPoolKeysV4,
    amountOut: number,
    baseToken: Token,
    quoteToken: Token
  ): Promise<{ transaction: Transaction; signers: Signer[] }> {
    try {
      console.log('Starting createSwapTransaction method.');
      const transaction: Transaction = new Transaction();
      const signers: Signer[] = [wallet]; // Добавляем wallet в signers

      // Вычисляем количество токенов CHEESE в минимальных единицах (учитывая decimals)
      const amountOutUnits = new TokenAmount(
        baseToken,
        (amountOut * Math.pow(10, baseToken.decimals)).toFixed(0)
      );
      console.log(`Desired amount out (CHEESE): ${amountOut}`);
      console.log(`Amount out in token units: ${amountOutUnits.raw.toString()}`);

      // Получаем связанные аккаунты токенов
      console.log('Getting associated token addresses...');
      const userWsolTokenAccount: PublicKey = await getAssociatedTokenAddress(
        poolKeys.quoteMint, // WSOL
        wallet.publicKey
      );

      const userCheeseTokenAccount: PublicKey = await getAssociatedTokenAddress(
        poolKeys.baseMint, // CHEESE
        wallet.publicKey
      );
  
      console.log('User WSOL token account:', userWsolTokenAccount.toString());
      console.log('User CHEESE token account:', userCheeseTokenAccount.toString());
  
      // Проверяем существование связанных аккаунтов токенов и создаём их при необходимости
      console.log('Checking if token accounts exist...');
      const userWsolTokenAccountInfo = await this.connection.getAccountInfo(userWsolTokenAccount);
      if (!userWsolTokenAccountInfo) {
        console.log('User WSOL token account does not exist. Creating...');
        const createWsolAccountIx = createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          userWsolTokenAccount,
          wallet.publicKey,
          poolKeys.quoteMint
        );
        transaction.add(createWsolAccountIx);
      } else {
        console.log('User WSOL token account exists.');
      }
  
      const userCheeseTokenAccountInfo = await this.connection.getAccountInfo(userCheeseTokenAccount);
      if (!userCheeseTokenAccountInfo) {
        console.log('User CHEESE token account does not exist. Creating...');
        const createUserCheeseTokenAccountIx = createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          userCheeseTokenAccount,
          wallet.publicKey,
          poolKeys.baseMint
        );
        transaction.add(createUserCheeseTokenAccountIx);
      } else {
        console.log('User CHEESE token account exists.');
      }
  
      // Переводим SOL в WSOL
      // Вычисляем amountIn, используя функцию estimateSolNeeded
      const poolInfo = await Liquidity.fetchInfo({
        connection: this.connection,
        poolKeys,
      });

      const estimatedSol = await this.estimateSolNeeded(
        poolKeys,
        poolInfo,
        amountOut,
        baseToken,
        quoteToken
      );

      const amountInLamports = Math.ceil(estimatedSol * Math.pow(10, quoteToken.decimals));
      console.log(`Wrapping SOL amount: ${amountInLamports} lamports`);

      const wrapSolIx = SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: userWsolTokenAccount,
        lamports: amountInLamports,
      });
      transaction.add(wrapSolIx);
      
      // Синхронизируем WSOL аккаунт
      const syncIx = createSyncNativeInstruction(userWsolTokenAccount);
      transaction.add(syncIx);

      // Создаём инструкции свопа
      console.log('Creating swap instructions...');

      const amountInTokenAmount = new TokenAmount(
        quoteToken,
        amountInLamports.toString()
      );

      const swapInstruction = await Liquidity.makeSwapInstruction({
        poolKeys,
        userKeys: {
          tokenAccountIn: userWsolTokenAccount, // WSOL аккаунт
          tokenAccountOut: userCheeseTokenAccount, // CHEESE аккаунт
          owner: wallet.publicKey,
        },
        amountIn: amountInTokenAmount, // Указываем amountIn
        amountOut: amountOutUnits,
        fixedSide: 'out',
      });
  
      if (!swapInstruction || !swapInstruction.innerTransaction) {
        throw new Error('Некорректный результат makeSwapInstruction.');
      }
  
      transaction.add(...swapInstruction.innerTransaction.instructions);
      signers.push(...swapInstruction.innerTransaction.signers);
  
      console.log('Swap instructions added to transaction.');

      // Закрываем WSOL аккаунт после завершения
      const closeWsolIx = createCloseAccountInstruction(
        userWsolTokenAccount,
        wallet.publicKey,
        wallet.publicKey
      );
      transaction.add(closeWsolIx);

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
}

export default BuyCoinsService;
