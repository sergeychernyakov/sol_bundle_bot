import { u8, u32, struct } from '@solana/buffer-layout';
import { u64, publicKey } from '@solana/buffer-layout-utils';

export const SPL_MINT_LAYOUT = struct<any>([
  u32('mintAuthorityOption'),
  publicKey('mintAuthority'),
  u64('supply'),
  u8('decimals'),
  u8('isInitialized'),
  u32('freezeAuthorityOption'),
  publicKey('freezeAuthority')
]);