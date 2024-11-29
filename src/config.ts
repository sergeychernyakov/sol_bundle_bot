import { Connection, Keypair, PublicKey } from "@solana/web3.js"
import bs58 from 'bs58';
import { Wallet } from "@project-serum/anchor";
import convict from 'convict';
import * as dotenv from 'dotenv';
dotenv.config();
 
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

const config = convict({
  bot_name: {
    format: String,
    default: 'local',
    env: '',
  },
  num_worker_threads: {
    format: Number,
    default: 4,
    env: '',
  },
  block_engine_urls: {
    format: Array,
    default: [''],
    doc: '',
    env: '',
  },
  auth_keypair_path: {
    format: String,
    default: '',
    env: '',
  },
  rpc_url: {
    format: String,
    default: 'https://api.mainnet-beta.solana.com',
    env: '',
  },
  rpc_requests_per_second: {
    format: Number,
    default: 0,
    env: '',
  },
  rpc_max_batch_size: {
    format: Number,
    default: 20,
    env: '',
  },
  geyser_url: {
    format: String,
    default: '',
    env: '',
  },
  geyser_access_token: {
    format: String,
    default: '',
    env: '',
  },
  arb_calculation_num_steps: {
    format: Number,
    default: 3,
    env: '',
  },
  max_arb_calculation_time_ms: {
    format: Number,
    default: 15,
    env: '',
  },
  payer_keypair_path: {
    format: String,
    default: '',
    env: '',
  },
  min_tip_lamports: {
    format: Number,
    default: 10000,
    env: '',
  },
  tip_percent: {
    format: Number,
    default: 50,
    env: '',
  },
});

config.validate({ allowed: 'strict' });

export { config };
