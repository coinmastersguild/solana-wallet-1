// @ts-nocheck
import {
  Keypair,
  Connection,
  SendOptions,
  VersionedTransaction,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram, ComputeBudgetProgram
} from '@solana/web3.js'
import {
  getMint,
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token'
import bs58 from 'bs58'
import nacl from 'tweetnacl'
import bip39 from 'bip39'
import { derivePath } from 'ed25519-hd-key'
import { Metaplex } from '@metaplex-foundation/js'

export const SOLANA_MAINNET_CHAINS: any = {
  'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ': {
    chainId: '4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ',
    name: 'Solana (Legacy)',
    logo: '/chain-logos/solana-5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp.png',
    rgb: '30, 240, 166',
    rpc: '',
    namespace: 'solana'
  },
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
    chainId: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    name: 'Solana',
    logo: '/chain-logos/solana-5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp.png',
    rgb: '30, 240, 166',
    rpc: 'https://api.mainnet-beta.solana.com',
    namespace: 'solana'
  }
}

export const SOLANA_TEST_CHAINS: any = {
  'solana:8E9rvCKLFQia2Y35HXjjpWzj8weVo44K': {
    chainId: '8E9rvCKLFQia2Y35HXjjpWzj8weVo44K',
    name: 'Solana Devnet (Legacy)',
    logo: '/chain-logos/solana-5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp.png',
    rgb: '30, 240, 166',
    rpc: '',
    namespace: 'solana'
  },
  'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1': {
    chainId: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
    name: 'Solana Devnet',
    logo: '/chain-logos/solana-5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp.png',
    rgb: '30, 240, 166',
    rpc: 'https://api.devnet.solana.com',
    namespace: 'solana'
  },
  'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z': {
    chainId: '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
    name: 'Solana Testnet',
    logo: '/chain-logos/solana-5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp.png',
    rgb: '30, 240, 166',
    rpc: 'https://api.testnet.solana.com',
    namespace: 'solana'
  }
}

export const SOLANA_CHAINS: any = { ...SOLANA_MAINNET_CHAINS, ...SOLANA_TEST_CHAINS }

export const SOLANA_SIGNING_METHODS: any = {
  SOLANA_SIGN_TRANSACTION: 'solana_signTransaction',
  SOLANA_SIGN_MESSAGE: 'solana_signMessage',
  SOLANA_SIGN_AND_SEND_TRANSACTION: 'solana_signAndSendTransaction',
  SOLANA_SIGN_ALL_TRANSACTIONS: 'solana_signAllTransactions'
}

interface IInitArguments {
  secretKey?: Uint8Array
  mnemonic?: string
  derivationPath?: string
}

export default class SolanaLib {
  keypair: any

  constructor(keypair: any) {
    this.keypair = keypair
  }

  static init({ secretKey, mnemonic, derivationPath }: IInitArguments): any {
    let keypair: any

    if (secretKey) {
      keypair = Keypair.fromSecretKey(secretKey)
    } else if (mnemonic) {
      const seed = bip39.mnemonicToSeedSync(mnemonic)
      const path = derivationPath || "m/44'/501'/0'/0'"
      const derivedKey = derivePath(path, seed.toString('hex')).key
      keypair = Keypair.fromSeed(derivedKey)
    } else {
      keypair = Keypair.generate()
    }

    return new SolanaLib(keypair)
  }

  public async getAddress(): Promise<any> {
    return this.keypair.publicKey.toBase58()
  }

  public getSecretKey(): any {
    return this.keypair.secretKey.toString()
  }

  public async signMessage(
      params: { message: string }
  ): Promise<{ signature: string }> {
    const signature = nacl.sign.detached(bs58.decode(params.message), this.keypair.secretKey)
    const bs58Signature = bs58.encode(signature)
    return { signature: bs58Signature }
  }

  public async signTransaction(params: { transaction: string }): Promise<{ transaction: string; signature: string }> {
    const transaction: any = this.deserialize(params.transaction)
    this.sign(transaction)

    return {
      transaction: this.serialize(transaction),
      signature: bs58.encode(transaction.signatures[0])
    }
  }

  public async signAndSendTransaction(params: { transaction: string; options?: SendOptions }, chainId: string): Promise<{ signature: string }> {
    const rpc = SOLANA_CHAINS[chainId]?.rpc

    if (!rpc) {
      throw new Error('There is no RPC URL for the provided chain')
    }

    const connection = new Connection(rpc)
    const transaction: any = this.deserialize(params.transaction)
    this.sign(transaction)

    const signature = await connection.sendTransaction(transaction, {
      maxRetries: 3,
      preflightCommitment: 'recent',
      ...params.options
    })

    return { signature }
  }

  public async signAllTransactions(params: { transactions: string[] }): Promise<{ transactions: string[] }> {
    const signedTransactions = params.transactions.map(tx => {
      const transactionObj: any = this.deserialize(tx)
      this.sign(transactionObj)
      return this.serialize(transactionObj)
    })

    return { transactions: signedTransactions }
  }

  private serialize(transaction: any): string {
    return Buffer.from(transaction.serialize()).toString('base64')
  }

  private deserialize(transaction: string): any {
    let bytes: Uint8Array
    try {
      bytes = bs58.decode(transaction)
    } catch {
      bytes = Buffer.from(transaction, 'base64')
    }

    return VersionedTransaction.deserialize(bytes)
  }

  private sign(transaction: any) {
    transaction.sign([this.keypair])
  }


  /*
  https://api.mainnet-beta.solana.com/
  https://solana-api.projectserum.com
  https://mainnet.helius-rpc.com/?api-key=25862a51-16e5-483f-aafc-e804084e8925

   */
  private getConnection(chainId: string = 'solana:mainnet'): any {
    let rpc = SOLANA_MAINNET_CHAINS[chainId]?.rpc || SOLANA_MAINNET_CHAINS['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'].rpc
    if (!rpc) {
      rpc = 'https://solana-api.projectserum.com'
    }
    return new Connection(rpc, 'confirmed')
  }

  public async getBalance(chainId: string = 'solana:mainnet'): Promise<any> {
    const connection = this.getConnection(chainId)
    const balanceLamports = await connection.getBalance(this.keypair.publicKey)
    return balanceLamports / LAMPORTS_PER_SOL
  }

  public async getTokenBalance(tokenMint: string, chainId: string = 'solana:mainnet'): Promise<any> {
    const connection = this.getConnection(chainId)
    const mintPubkey = new PublicKey(tokenMint)
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(this.keypair.publicKey, { mint: mintPubkey })
    if (tokenAccounts.value.length === 0) return 0
    const amount = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount
    return amount
  }

  public async getNfts(chainId: string = 'solana:mainnet'): Promise<any[]> {
    const connection = this.getConnection(chainId)
    const metaplex = Metaplex.make(connection)
    const allNfts = await metaplex.nfts().findAllByOwner({ owner: this.keypair.publicKey })
    return allNfts as any[]
  }

  /**
   * Sends SOL by building a transaction
   */
  public async sendSol(to: string, amountSol: number, chainId: string = 'solana:mainnet'): Promise<any> {
    const connection = this.getConnection(chainId)
    const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.keypair.publicKey,
          toPubkey: new PublicKey(to),
          lamports: Math.round(amountSol * LAMPORTS_PER_SOL)
        })
    )
    console.log('')
    transaction.feePayer = this.keypair.publicKey
    transaction.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash
    transaction.sign(this.keypair)

    const txid = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: false })
    await connection.confirmTransaction(txid, 'confirmed')
    return txid
  }

  /**
   * Sends tokens by constructing an instruction with createTransferInstruction
   */
  public async sendToken(tokenMint: string, to: string, amount: number, chainId: string = 'solana:mainnet', useFeeBump:boolean = false): Promise<any> {
    const connection = this.getConnection(chainId)
    const mintPubkey = new PublicKey(tokenMint)
    const fromPubkey = this.keypair.publicKey
    const toPubkey = new PublicKey(to)

    const mintInfo = await getMint(connection, mintPubkey)
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        this.keypair,
        mintPubkey,
        fromPubkey
    )
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        this.keypair,
        mintPubkey,
        toPubkey
    )

    // Create a transfer instruction instead of calling transfer()
    const instruction = createTransferInstruction(
        fromTokenAccount.address,
        toTokenAccount.address,
        this.keypair.publicKey,
        BigInt(amount * 10 ** mintInfo.decimals),
        [],
        TOKEN_PROGRAM_ID
    )

    const tx = new Transaction().add(instruction)

    if (useFeeBump) {
      let priorityFeeMicroLamports = 2
      const setComputeUnitLimitIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1400000 })
      const setComputeUnitPriceIx = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFeeMicroLamports })
      tx.add(setComputeUnitLimitIx)
      tx.add(setComputeUnitPriceIx)
    }

    tx.feePayer = this.keypair.publicKey
    tx.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash
    tx.sign(this.keypair)

    const txid = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false })
    await connection.confirmTransaction(txid, 'confirmed')
    return txid
  }

  public async sendNft(nftMint: string, to: string, chainId: string = 'solana:mainnet'): Promise<any> {
    return this.sendToken(nftMint, to, 1, chainId)
  }
}
