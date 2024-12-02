import {
    Connection,
    Transaction,
    Keypair,
    sendAndConfirmTransaction,
  } from '@solana/web3.js';
  
  // Утилита для обработки связанных транзакций в обход публичного мемпула
  export async function bundleTransaction(
    connection: Connection,
    transaction: Transaction,
    signers: Keypair[]
  ): Promise<void> {
    try {
      const signature = await sendAndConfirmTransaction(connection, transaction, signers, {
        skipPreflight: true,
      });
      console.log(`Bundle transaction signature: ${signature}`);
    } catch (error) {
      console.error('Bundle transaction failed:', error);
    }
  }
  