import { Keypair } from '@solana/web3.js';
import { config } from '../config';

import {
  SearcherClient,
  searcherClient as jitoSearcherClient,
} from 'jito-ts/dist/sdk/block-engine/searcher.js';
import * as fs from 'fs';

const BLOCK_ENGINE_URLS = config.get('block_engine_urls');
const AUTH_KEYPAIR_PATH = config.get('auth_keypair_path');

const decodedKey = new Uint8Array(
  JSON.parse(fs.readFileSync(AUTH_KEYPAIR_PATH).toString()) as number[],
);
const keypair = Keypair.fromSecretKey(decodedKey);

export const privateKey = keypair

const searcherClients: SearcherClient[] = [];

for (const url of BLOCK_ENGINE_URLS) {
  const client = jitoSearcherClient(url, keypair, {
    'grpc.keepalive_timeout_ms': 4000,
  });
  searcherClients.push(client);
}

// all bundles sent get automatically forwarded to the other regions.
// assuming the first block engine in the array is the closest one
const searcherClient = searcherClients[0];

export { searcherClient, searcherClients };