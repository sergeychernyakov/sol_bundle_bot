import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { bundleTransaction } from '../utils/bundle_transaction';
import { getWallets } from '../clients/wallet_client';
import readlineSync from 'readline-sync';
import * as dotenv from 'dotenv';


dotenv.config();

const TOKEN_MINT_ADDRESS = process.env.TOKEN_MINT_ADDRESS!;

export class BuyTokensService {
  async buyTokens(): Promise<void> {
    const tokenMint = new PublicKey(TOKEN_MINT_ADDRESS);
    const wallets = getWallets();

    const totalAmountInput: string = readlineSync.question('Введите общее количество токенов для покупки (по умолчанию 20000): ');
    const amount: number = parseFloat(totalAmountInput) || 20000;

    const amounts: number[] = this.distributeAmount(amount, wallets.length);
    console.log('Amounts distributed among wallets:', amounts);

    // Вывод списка транзакций и запрос подтверждения
    console.log('\nСписок транзакций для отправки:');
    for (let i = 0; i < wallets.length; i++) {
      console.log(`Транзакция ${i + 1}:`);
      console.log(`Кошелёк: ${wallets[i].publicKey.toString()}`);
      console.log(`Сумма покупки (CHEESE): ${amounts[i]}`);
    }

    const confirmation = readlineSync.question('\nОтправить транзакции? (y/n): ');
    if (!['да', 'д', 'y', 'yes'].includes(confirmation.toLowerCase())) {
      console.log('Отправка транзакций отменена пользователем.');
      return;
    }

    for (const wallet of wallets) {
      const transaction = new Transaction().add(
        new TransactionInstruction({
          keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: true }],
          data: Buffer.from([amount]),
          programId: tokenMint,
        })
      );

      await bundleTransaction([transaction], [wallet]);
      console.log(`Purchased tokens with wallet: ${wallet.publicKey.toString()}`);
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
