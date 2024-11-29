import {
    Liquidity,
    SPL_ACCOUNT_LAYOUT,
    Token,
    TOKEN_PROGRAM_ID,
    TokenAccount,
  } from '@raydium-io/raydium-sdk';
  import {
    Connection,
    Keypair,
    PublicKey,
    SendOptions,
    Signer,
    Transaction,
    VersionedTransaction,
  } from '@solana/web3.js';
  
  import {
    feeId,
    makeTxVersion,
    PROGRAMIDS, 
  } from './constants';
  import { connection, walletconn } from '../config';
  import { BN } from '@project-serum/anchor';
   
  type LiquidityPairTargetInfo = {
      baseToken: Token
      quoteToken: Token
      targetMarketId: PublicKey
  }
  type CalcStartPrice = {
      addBaseAmount: BN
      addQuoteAmount: BN
  }
  type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>
  
  
  type TestTxInputInfo = LiquidityPairTargetInfo &
    CalcStartPrice & {
      startTime: number // seconds
      walletTokenAccounts: WalletTokenAccounts
      wallet: Keypair
    }
  export async function sendTx(
    connection: Connection,
    payer: Keypair | Signer,
    txs: (VersionedTransaction | Transaction)[],
    options?: SendOptions
  ): Promise<string[]> {
    const txids: string[] = [];
    for (const iTx of txs) {
      if (iTx instanceof VersionedTransaction) {
        iTx.sign([payer]);
        txids.push(await connection.sendTransaction(iTx, options));
      } else {
        iTx.sign(payer);
        txids.push(await connection.sendTransaction(iTx, [payer], options));
      }
    }
    return txids;
  }
  
  export async function getWalletTokenAccount(connection: Connection, wallet: PublicKey): Promise<TokenAccount[]> {
    const walletTokenAccount = await connection.getTokenAccountsByOwner(wallet, {
      programId: TOKEN_PROGRAM_ID,
    });
    return walletTokenAccount.value.map((i) => ({
      pubkey: i.pubkey,
      programId: i.account.owner,
      accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
    }));
  }
  
  
  export async function sendTransaction( senderTx: (VersionedTransaction | Transaction)[],options?: SendOptions){
    return await sendTx(connection, walletconn.payer, senderTx, options)
  
  }
  
  export async function ammCreatePool(input: TestTxInputInfo) {
    // -------- step 1: make instructions --------
    const initPoolInstructionResponse = await Liquidity.makeCreatePoolV4InstructionV2Simple({
      connection,
      programId: PROGRAMIDS.AmmV4,
      marketInfo: {
        marketId: input.targetMarketId,
        programId: PROGRAMIDS.OPENBOOK_MARKET,
      },
      baseMintInfo: input.baseToken,
      quoteMintInfo: input.quoteToken,
      baseAmount: input.addBaseAmount,
      quoteAmount: input.addQuoteAmount,
      startTime: new BN(Math.floor(input.startTime)),
      ownerInfo: {
        feePayer: input.wallet.publicKey,
        wallet: input.wallet.publicKey,
        tokenAccounts: input.walletTokenAccounts,
        useSOLBalance: true,
      },
      associatedOnly: false,
      checkCreateATAOwner: true,
      makeTxVersion,
      feeDestinationId: feeId, // only mainnet use this
    })
  
    return { txs: initPoolInstructionResponse }
  }