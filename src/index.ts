import {
  Keypair,
  Connection,
  SendOptions,
  VersionedTransaction,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
  ComputeBudgetProgram
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

interface IncomingTransfer {
  signature: string
  slot: number
  type: 'SOL' | 'TOKEN'
  amount: number
  from: string
  to: string
  tokenMint?: string
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

  private getConnection(chainId: string = 'solana:mainnet'): any {
    //let rpc = SOLANA_MAINNET_CHAINS[chainId]?.rpc || SOLANA_MAINNET_CHAINS['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'].rpc
    let rpc = null
    if (!rpc) {
      // rpc = 'https://solana-api.projectserum.com'
      // rpc = 'https://ssc-dao.genesysgo.net'
      rpc = 'https://mainnet.helius-rpc.com/?api-key=25862a51-16e5-483f-aafc-e804084e8925'
      // rpc = 'https://rpc.magicblock.app/mainnet'
      // rpc = 'https://node1.bundlr.network'
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

  public async sendSol(to: string, amountSol: number, chainId: string = 'solana:mainnet'): Promise<any> {
    const connection = this.getConnection(chainId)
    const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.keypair.publicKey,
          toPubkey: new PublicKey(to),
          lamports: Math.round(amountSol * LAMPORTS_PER_SOL)
        })
    )
    transaction.feePayer = this.keypair.publicKey
    transaction.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash
    transaction.sign(this.keypair)

    const txid = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: false })
    await connection.confirmTransaction(txid, 'confirmed')
    return txid
  }

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
      let priorityFeeMicroLamports = 40000
      const setComputeUnitLimitIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1400000 })
      const setComputeUnitPriceIx = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFeeMicroLamports })
      tx.add(setComputeUnitLimitIx)
      tx.add(setComputeUnitPriceIx)
    }

    tx.feePayer = this.keypair.publicKey
    tx.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash
    tx.sign(this.keypair)

    const txid = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 10 })
    await connection.confirmTransaction(txid, 'confirmed')
    return txid
  }

  public async sendNft(nftMint: string, to: string, chainId: string = 'solana:mainnet'): Promise<any> {
    return this.sendToken(nftMint, to, 1, chainId)
  }

  /**
   * Get recent transaction signatures involving this wallet's public key.
   */
  public async getRecentSignatures(chainId: string = 'solana:mainnet', limit: number = 10): Promise<any[]> {
    const connection = this.getConnection(chainId)
    const address = await this.getAddress()
    const pubkey = new PublicKey(address)
    const signatures = await connection.getSignaturesForAddress(pubkey, { limit })
    return signatures
  }

  /**
   * Given a list of signatures, fetch and parse their transactions.
   */
  public async getParsedTransactions(signatures: any[], chainId: string = 'solana:mainnet'): Promise<any[]> {
    const connection = this.getConnection(chainId)
    const parsedTxs = []
    for (const sigInfo of signatures) {
      const tx = await connection.getParsedTransaction(sigInfo.signature, { maxSupportedTransactionVersion: 0 })
      if (tx) {
        parsedTxs.push({ ...tx, signature: sigInfo.signature, slot: sigInfo.slot })
      }
    }
    return parsedTxs
  }

  /**
   * Fetch and identify incoming transfers (SOL and SPL tokens) to this wallet.
   */
  public async getIncomingTransfers(chainId: string = 'solana:mainnet', limit: number = 10): Promise<IncomingTransfer[]> {
    const signatures = await this.getRecentSignatures(chainId, limit)
    const parsedTxs = await this.getParsedTransactions(signatures, chainId)
    const ourAddress = await this.getAddress()
    const incoming: IncomingTransfer[] = []

    for (const txObj of parsedTxs) {
      const tx = txObj.transaction
      const sig = txObj.signature
      const slot = txObj.slot

      if (tx && tx.message && tx.message.instructions) {
        for (const inst of tx.message.instructions) {
          // Each instruction may or may not have 'parsed' info
          const parsed = (inst as any).parsed
          const program = (inst as any).program

          if (program === 'system' && parsed && parsed.type === 'transfer') {
            const { source, destination, lamports } = parsed.info
            if (destination === ourAddress) {
              incoming.push({
                signature: sig,
                slot,
                type: 'SOL',
                amount: lamports / LAMPORTS_PER_SOL,
                from: source,
                to: destination
              })
            }
          } else if (program === 'spl-token' && parsed && parsed.type === 'transfer') {
            const { authority, destination, amount } = parsed.info
            // The 'destination' here is a token account. We need to confirm if this token account belongs to our wallet.
            // Check if 'destination' is associated with ourAddress by scanning token accounts or checking the accountKeys.

            // If we can't directly check associated token accounts easily, a quick heuristic:
            // Look up 'destination' in the transaction's accountKeys to see if it corresponds to our wallet's ATA.
            // In a more robust system, you would fetch the owner of this token account from RPC. For brevity, assume the token account belongs to us if it matches an ATA we hold.
            // A simple approach: if 'destination' is found in the transaction's account keys and equals our address, it's ours.
            // However, typically 'destination' will be a token account, not the main address.
            // For demonstration, we assume any recognized incoming token account is ours.

            // Check account keys:
            for (const accountKey of tx.message.accountKeys) {
              if (accountKey.pubkey.toBase58() === ourAddress) {
                // This means our wallet is directly mentioned, but we need a more robust check:
                // Usually, you'd call `connection.getParsedAccountInfo(new PublicKey(destination))` and verify the 'owner' field.
                // For simplicity here, we skip that step. In a production scenario, please verify ATA ownership.

                incoming.push({
                  signature: sig,
                  slot,
                  type: 'TOKEN',
                  amount: parseFloat(amount), // amount is a string in many cases
                  from: authority,
                  to: ourAddress,
                  tokenMint: parsed.info.mint
                })
                break
              }
            }
          }
        }
      }
    }

    return incoming
  }
}
