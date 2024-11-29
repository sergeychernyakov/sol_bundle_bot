import { PublicKey } from "@solana/web3.js"
import {
  ENDPOINT as _ENDPOINT,
  MAINNET_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
  TxVersion,
} from '@raydium-io/raydium-sdk';
 
export const PROGRAMIDS = MAINNET_PROGRAM_ID;   
export const makeTxVersion = TxVersion.V0;    
 
export const DEFAULT_TOKEN = {
  'SOL': new Token(TOKEN_PROGRAM_ID, new PublicKey(''), 9, 'WSOL', 'WSOL'),
  'USDC': new Token(TOKEN_PROGRAM_ID, new PublicKey(''), 6, 'USDC', 'USDC'),
  'RAY': new Token(TOKEN_PROGRAM_ID, new PublicKey(''), 6, 'RAY', 'RAY'),
  'RAY_USDC-LP': new Token(TOKEN_PROGRAM_ID, new PublicKey(''), 6, 'RAY-USDC', 'RAY-USDC'),
}

export const feeId = new PublicKey("") //NEED PUBLIC KEY