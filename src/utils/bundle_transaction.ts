import { Transaction } from '@solana/web3.js';
import bs58 from 'bs58';

export async function bundleTransaction(
  transactions: Transaction[],
  signers: any[]
): Promise<void> {
  try {
    console.log('Формирование бандла транзакций...');

    // Подписываем все транзакции
    for (const tx of transactions) {
      await tx.sign(...signers);
    }

    // Конвертация в base58 с использованием bs58
    const transactionsBase58 = transactions.map((tx) =>
      bs58.encode(tx.serialize())
    );

    // Отправка бандла
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
