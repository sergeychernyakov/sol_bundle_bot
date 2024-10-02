class WalletTopUp {
  private connection: Connection;
  private walletManager: WalletManager;

  constructor(connection: Connection, walletManager: WalletManager) {
    this.connection = connection;
    this.walletManager = walletManager;
  }

  // Метод для получения последнего blockhash с экспоненциальной задержкой
  private async getLatestBlockhashWithRetries(maxRetries = 7, initialDelay = 1000): Promise<BlockhashWithExpiryBlockHeight> {
    let attempts = 0;
    let delay = initialDelay;
    
    while (attempts < maxRetries) {
      try {
        return await this.connection.getLatestBlockhash();
      } catch (error: any) {
        attempts++;
        if (error.message.includes('429')) {
          console.error(`Превышен лимит запросов. Повтор через ${delay} мс...`);
          await new Promise(res => setTimeout(res, delay));
          delay *= 2; // Увеличиваем задержку экспоненциально
        } else {
          if (attempts >= maxRetries) {
            throw error;
          }
          await new Promise(res => setTimeout(res, delay));
        }
      }
    }
    throw new Error('Не удалось получить blockhash после нескольких попыток');
  }

  // Метод для пополнения кошельков
  public async topUpWallets(): Promise<void> {
    const wallets = this.walletManager.getValidWalletsKeys();
    if (wallets.length === 0) {
      console.log('Нет доступных кошельков для пополнения.');
      return;
    }

    const masterWalletPrivateKey = this.walletManager.getEnvVariable('MASTER_WALLET_PRIVATE_KEY');
    if (!masterWalletPrivateKey) {
      console.error('Приватный ключ мастер-кошелька не найден.');
      return;
    }
    const decodedMasterWalletPrivateKey = bs58.decode(masterWalletPrivateKey);
    const masterWallet = Keypair.fromSecretKey(decodedMasterWalletPrivateKey);

    const solAmountInput = readlineSync.question(
      'Введите количество SOL для пополнения кошельков (по умолчанию 0.01): '
    );
    const solAmount = parseFloat(solAmountInput) || 0.01;

    const confirmation = readlineSync.question(
      `Вы уверены, что хотите пополнить ${wallets.length} кошельков на ${solAmount} SOL? (да/нет): `
    ).toLowerCase();

    if (!['да', 'д', 'y', 'yes'].includes(confirmation)) {
      console.log('Операция отменена.');
      return;
    }

    for (const wallet of wallets) {
      try {
        let blockhashInfo: BlockhashWithExpiryBlockHeight;
        try {
          blockhashInfo = await this.getLatestBlockhashWithRetries();
        } catch (error) {
          console.error('Не удалось получить blockhash:', error);
          continue;
        }

        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: masterWallet.publicKey,
            toPubkey: wallet.publicKey,
            lamports: solAmount * LAMPORTS_PER_SOL,
          })
        );

        transaction.recentBlockhash = blockhashInfo.blockhash;
        transaction.lastValidBlockHeight = blockhashInfo.lastValidBlockHeight;
        transaction.feePayer = masterWallet.publicKey;

        const signature = await sendAndConfirmTransaction(
          this.connection,
          transaction,
          [masterWallet]
        );

        console.log(`Кошелек ${wallet.publicKey.toString()} пополнен на ${solAmount} SOL. Транзакция: https://explorer.solana.com/tx/${signature}`);

        await new Promise(res => setTimeout(res, 2000)); // Увеличиваем задержку между транзакциями
      } catch (error) {
        console.error(`Ошибка при пополнении кошелька ${wallet.publicKey.toString()}:`, error);
      }
    }
  }
}

export default WalletTopUp;