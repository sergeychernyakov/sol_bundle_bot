import { Transaction, Connection, Keypair, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import bs58 from 'bs58';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = new Connection('https://api.mainnet-beta.solana.com');

const masterWalletPrivateKey = bs58.decode(process.env.MASTER_WALLET_PRIVATE_KEY!.trim());
const masterWalletKeypair = Keypair.fromSecretKey(masterWalletPrivateKey);
const masterWalletPublicKey = masterWalletKeypair.publicKey;

export async function bundleTransaction(
  transactions: Transaction[],
  signers: Keypair[]
): Promise<void> {
  try {
    console.log('Формирование бандла транзакций...');

    const recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;

    transactions.forEach((tx) => {
      tx.recentBlockhash = recentBlockhash;
      tx.feePayer = signers[0].publicKey;
    
      // Добавление фиктивной инструкции для write lock на masterWalletPublicKey
      const fakeInstruction = new TransactionInstruction({
        keys: [{ pubkey: masterWalletPublicKey, isSigner: false, isWritable: true }],
        programId: SystemProgram.programId,
        data: Buffer.from([]), // Пустой Buffer
      });
    
      // Инструкция для перевода tip (0.000001 SOL)
      tx.add(fakeInstruction); // Сначала фиктивная инструкция
      tx.add(
        SystemProgram.transfer({
          fromPubkey: signers[0].publicKey,
          toPubkey: masterWalletPublicKey,
          lamports: 1000, // Минимальный "tip"
        })
      );
    });
    

    // Подписываем транзакции
    transactions.forEach((tx) => tx.sign(...signers));

    // Конвертация в base58
    const transactionsBase58 = transactions.map((tx) =>
      bs58.encode(tx.serialize())
    );

    await sendBundle(transactionsBase58);
  } catch (error) {
    console.error('Ошибка при отправке бандла транзакций:', error);
  }
}

async function sendBundle(transactionsBase58: string[]): Promise<void> {
  try {
    console.log('Подготовка к отправке бандла.');

    if (transactionsBase58.length === 0) {
      console.error('Нет транзакций для отправки в бандле.');
      return;
    }

    const rpcUrl = 'https://mainnet.block-engine.jito.wtf';

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