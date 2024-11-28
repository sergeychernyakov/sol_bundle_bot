import { Connection, Keypair, PublicKey } from "@solana/web3.js"
import bs58 from 'bs58';
import { Wallet } from "@project-serum/anchor";
 
const QUICK_NODE_API_KEY = process.env.QUICK_NODE_API_KEY
;
export const quickNodeUrl = `https://necessary-light-shape.solana-mainnet.quiknode.pro/${QUICK_NODE_API_KEY}/`;

// Создание соединения с QuickNode RPC-сервером
export const connection = new Connection(quickNodeUrl, 'confirmed');

export const tipAcct = new PublicKey(''); // NEED PUBLIC KEY

export const wallet = Keypair.fromSecretKey(
    bs58.decode(
      '' // PRIV KEY OF POOL CREATOR
    )
);

export const payer = Keypair.fromSecretKey(
  bs58.decode(
      '' // PRIV KEY OF FEE PAYER!!!!!!
  )
);

export const walletconn = new Wallet(wallet);

export const RayLiqPoolv4 = new PublicKey('') //NEED PUBLIC KEY