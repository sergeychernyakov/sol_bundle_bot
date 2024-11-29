import { Keypair, PublicKey, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export class WalletClient {
    private connection: Connection;

    constructor() {
        const rpcUrl = process.env.RPC_URL;
        if (!rpcUrl) {
        throw new Error('RPC_URL is not defined in .env file');
        }
        this.connection = new Connection(rpcUrl, 'confirmed');
    }

    // Method for obtaining the compound
    getConnection(): Connection {
        return this.connection;
    }

  // Logic of creating a wallet
  createWallet(): Keypair {
    const wallet = Keypair.generate();
    console.log('Wallet created:', wallet.publicKey.toBase58());
    return wallet;
  }

  // Logic of getting balance
  async getBalance(walletAddress: string): Promise<number> {
    const publicKey = new PublicKey(walletAddress);
    const balance = await this.connection.getBalance(publicKey);
    console.log(`Balance of ${walletAddress}:`, balance / LAMPORTS_PER_SOL, 'SOL');
    return balance / LAMPORTS_PER_SOL;
  }

  // Loading a wallet from a file
  loadWallet(): Keypair {
    const secretKeyPath = process.env.WALLET_SECRET_KEY_PATH;
    if (!secretKeyPath) {
      throw new Error('WALLET_SECRET_KEY_PATH is not defined in .env file');
    }
    const secretKey = JSON.parse(fs.readFileSync(path.resolve(secretKeyPath), 'utf-8'));
    return Keypair.fromSecretKey(Uint8Array.from(secretKey));
  }
}