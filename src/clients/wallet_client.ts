import { Keypair } from '@solana/web3.js';
import * as dotenv from 'dotenv';

dotenv.config();

export function getWallets(): Keypair[] {
  const keys = process.env.BUNDLE_WALLET_PRIVATE_KEYS!.split(',');
  return keys.map((key) => Keypair.fromSecretKey(Uint8Array.from(JSON.parse(key))));
}
