import { connection, wallet, tipAcct } from "../config";
import { PublicKey, VersionedTransaction,  TransactionInstruction, TransactionMessage, SystemProgram, Keypair, LAMPORTS_PER_SOL, AddressLookupTableAccount } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { MAINNET_PROGRAM_ID } from "@raydium-io/raydium-sdk";
import { loadKeypairs } from './create_keys_service';
import promptSync from "prompt-sync";
import * as spl from '@solana/spl-token';
import { IPoolKeys } from '../clients/interfaces';
import { derivePoolKeys } from "../clients/pool_keys_reassigned"; 
import path from 'path';
import fs from 'fs';

const prompt = promptSync();
const keyInfoPath = path.join(__dirname, 'keyInfo.json');

swapper();

export async function swapper() {
    const bundledTxns: VersionedTransaction[] = [];
    const keypairs: Keypair[] = loadKeypairs();

    let poolInfo: { [key: string]: any } = {};
    if (fs.existsSync(keyInfoPath)) {
        const data = fs.readFileSync(keyInfoPath, 'utf-8');
        poolInfo = JSON.parse(data);
    }

    const lut = new PublicKey(poolInfo.addressLUT.toString());

    const lookupTableAccount = (
        await connection.getAddressLookupTable(lut)
    ).value;

    if (lookupTableAccount == null) {
        console.log("Lookup table account not found!");
        process.exit(0);
    }

    // -------- step 1: ask nessesary questions for pool build --------
    const OpenBookID = prompt('OpenBook MarketID: ') || '';
    const jitoTipAmtInput = prompt('Jito tip in Sol (Ex. 0.01): ') || '0';
    const jitoTipAmt = parseFloat(jitoTipAmtInput) * LAMPORTS_PER_SOL;




    // -------- step 2: create pool txn --------
    const targetMarketId = new PublicKey(OpenBookID)

    const { blockhash } = await connection.getLatestBlockhash('finalized');


    // -------- step 3: create swap txns --------
    const txMainSwaps: VersionedTransaction[] = await createWalletSwaps(
        targetMarketId, 
        blockhash,
        keypairs,
        jitoTipAmt,
        lookupTableAccount,
    )
    bundledTxns.push(...txMainSwaps);
    
    // -------- step 4: send bundle --------
    ///*
    // Simulate each transaction
    for (const tx of bundledTxns) {
        try {
            const simulationResult = await connection.simulateTransaction(tx, { commitment: "processed" });
            console.log(simulationResult);

            if (simulationResult.value.err) {
                console.error("Simulation error for transaction:", simulationResult.value.err);
            } else {
                console.log("Simulation success for transaction. Logs:");
                simulationResult.value.logs?.forEach(log => console.log(log));
            }
        } catch (error) {
            console.error("Error during simulation:", error);
        }
    }

    bundledTxns.length = 0;
    return;
}

async function createWalletSwaps(
    marketID: PublicKey, 
    blockhash: string,
    keypairs: Keypair[],
    jitoTip: number,
    lut: AddressLookupTableAccount,
): Promise<VersionedTransaction[]> {
    const txsSigned: VersionedTransaction[] = [];
    const chunkedKeypairs = chunkArray(keypairs, 7);
    const keys = await derivePoolKeys(marketID);

    // Iterate over each chunk of keypairs
    for (let chunkIndex = 0; chunkIndex < chunkedKeypairs.length; chunkIndex++) {
        const chunk = chunkedKeypairs[chunkIndex];
        const instructionsForChunk: TransactionInstruction[] = [];

        // Iterate over each keypair in the chunk to create swap instructions
        for (let i = 0; i < chunk.length; i++) {
            const keypair = chunk[i];
            console.log(`Processing keypair ${i + 1}/${chunk.length}:`, keypair.publicKey.toString());

            if (keys == null) {
                console.log("Error fetching poolkeys");
                process.exit(0);
            }

            const TokenATA = await spl.getAssociatedTokenAddress(
                new PublicKey(keys.baseMint),
                keypair.publicKey,
            );

            const wSolATA = await spl.getAssociatedTokenAddress(
                spl.NATIVE_MINT,
                keypair.publicKey,
            );

            const { buyIxs } = makeSwap(keys, wSolATA, TokenATA, true, keypair); //  CHANGE FOR SELL

            instructionsForChunk.push(...buyIxs); // CHANGE FOR SELL
        }

        if (chunkIndex === chunkedKeypairs.length - 1) {
            const tipSwapIxn = SystemProgram.transfer({
                fromPubkey: wallet.publicKey,
                toPubkey: tipAcct,
                lamports: BigInt(jitoTip),
            });
            instructionsForChunk.push(tipSwapIxn);
            console.log('Jito tip added :).');
        }

        const message = new TransactionMessage({
            payerKey: wallet.publicKey,
            recentBlockhash: blockhash,
            instructions: instructionsForChunk,
        }).compileToV0Message([lut]);

        const versionedTx = new VersionedTransaction(message);

        const serializedMsg = versionedTx.serialize();
        console.log("Txn size:", serializedMsg.length);
        if (serializedMsg.length > 1232) { console.log('tx too big'); }
        
        console.log("Signing transaction with chunk signers", chunk.map(kp => kp.publicKey.toString()));

        for (const keypair of chunk) {
            versionedTx.sign([keypair]);
        }
        versionedTx.sign([wallet])


        txsSigned.push(versionedTx);
    }

    return txsSigned;
}

function chunkArray<T>(array: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(array.length / size) }, (v, i) =>
        array.slice(i * size, i * size + size)
    );
}

function makeSwap(
    poolKeys: IPoolKeys, 
    wSolATA: PublicKey,
    TokenATA: PublicKey,
    reverse: boolean,
    keypair: Keypair,
  ) { 
  const programId = new PublicKey(''); // NEED PUBLIC KEY 
  const account1 = TOKEN_PROGRAM_ID; 
  const account2 = poolKeys.id; 
  const account3 = poolKeys.authority; 
  const account4 = poolKeys.openOrders;   
  const account5 = poolKeys.targetOrders;    
  const account6 = poolKeys.baseVault;
  const account7 = poolKeys.quoteVault; 
  const account8 = poolKeys.marketProgramId;
  const account9 = poolKeys.marketId;
  const account10 = poolKeys.marketBids;   
  const account11 = poolKeys.marketAsks;   
  const account12 = poolKeys.marketEventQueue;
  const account13 = poolKeys.marketBaseVault;
  const account14 = poolKeys.marketQuoteVault;
  const account15 = poolKeys.marketAuthority;
  let account16 = wSolATA;
  let account17 = TokenATA;
  const account18 = keypair.publicKey;
  const account19 = MAINNET_PROGRAM_ID.AmmV4;
  
  if (reverse == true) {
    account16 = TokenATA;
    account17 = wSolATA;
  }
  
  const buffer = Buffer.alloc(16);
  const prefix = Buffer.from([0x09]);
  const instructionData = Buffer.concat([prefix, buffer]);
  const accountMetas = [
    { pubkey: account1, isSigner: false, isWritable: false },
    { pubkey: account2, isSigner: false, isWritable: true },
    { pubkey: account3, isSigner: false, isWritable: false },
    { pubkey: account4, isSigner: false, isWritable: true },
    { pubkey: account5, isSigner: false, isWritable: true },
    { pubkey: account6, isSigner: false, isWritable: true },
    { pubkey: account7, isSigner: false, isWritable: true },
    { pubkey: account8, isSigner: false, isWritable: false },
    { pubkey: account9, isSigner: false, isWritable: true },
    { pubkey: account10, isSigner: false, isWritable: true },
    { pubkey: account11, isSigner: false, isWritable: true },
    { pubkey: account12, isSigner: false, isWritable: true },
    { pubkey: account13, isSigner: false, isWritable: true },
    { pubkey: account14, isSigner: false, isWritable: true },
    { pubkey: account15, isSigner: false, isWritable: false },
    { pubkey: account16, isSigner: false, isWritable: true },
    { pubkey: account17, isSigner: false, isWritable: true },
    { pubkey: account18, isSigner: true, isWritable: true },
    { pubkey: account19, isSigner: false, isWritable: true }
  ];
  
  const swap = new TransactionInstruction({
    keys: accountMetas,
    programId,
    data: instructionData
  });


  let buyIxs: TransactionInstruction[] = [];
  let sellIxs: TransactionInstruction[] = [];
  
  if (reverse === false) {
    buyIxs.push(swap);
  }
  
  if (reverse === true) {
    sellIxs.push(swap);
  }
  
  return { buyIxs, sellIxs } ;
}