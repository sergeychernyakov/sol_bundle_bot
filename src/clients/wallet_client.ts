import { Keypair } from '@solana/web3.js';
import * as dotenv from 'dotenv';
import bs58 from 'bs58';


dotenv.config();

export function getWallets(): Keypair[] {
  const keysString = process.env.BUNDLE_WALLET_PRIVATE_KEYS!;
  const keys = keysString.split(',');

  // Конвертируем каждый ключ из Base58 в Keypair
  return keys.map((key) => {
    try {
      const secretKey = bs58.decode(key.trim());
      return Keypair.fromSecretKey(secretKey);
    } catch (error) {
      throw new Error(`Ошибка при обработке приватного ключа: ${key} - ${error}`);
    }
  });
}
