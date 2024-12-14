require('dotenv').config({ path: "../.env" })
require('dotenv').config({ path: ".env" })
const SolanaLib = require('../dist').default

let seed = process.env['WALLET_SEED']
if(!seed) throw Error('Missing WALLET_SEED in .env file')

let run_test = async function () {
    try {
        // Initialize the wallet from seed mnemonic
        let wallet = SolanaLib.init({ mnemonic: seed })

        // get address
        let address = await wallet.getAddress()
        console.log("Address:", address)

        // get balance
        let balance = await wallet.getBalance("solana:mainnet")
        console.log("SOL Balance:", balance, "SOL")

        // get token balance (example)
        let tokenBalance = await wallet.getTokenBalance("5gVSqhk41VA8U6U4Pvux6MSxFWqgptm3w58X9UTGpump", "solana:mainnet")
        console.log("CLUBMOON Token Balance:", tokenBalance)

        // get NFTs
        let nfts = await wallet.getNfts("solana:mainnet")
        console.log("NFT Count:", nfts.length)
        nfts.forEach((nft, i) => {
            console.log(`NFT #${i+1}: ${nft.name} (${nft.address.toBase58()})`)
        })

        // Uncomment if you want to send SOL (ensure you have enough balance!)
        // let sendSolTx = await wallet.sendSol("5RU2erdSLHU8oVEFVK82KCoTSpZt7a6J6gyXcfRVUj5v", 0.0001, "solana:mainnet")
        // console.log("Sent SOL Tx:", sendSolTx)

        // Uncomment if you want to send tokens (ensure you have these tokens!)
        // let sendTokenTx = await wallet.sendToken("5gVSqhk41VA8U6U4Pvux6MSxFWqgptm3w58X9UTGpump", "5RU2erdSLHU8oVEFVK82KCoTSpZt7a6J6gyXcfRVUj5v", 1, "solana:mainnet", true)
        // console.log("Sent Token Tx:", sendTokenTx)

        // Uncomment if you want to send NFT (ensure you have the NFT in your wallet)
        // let sendNftTx = await wallet.sendNft("NftMintAddressHere", "RecipientPublicKeyHere", "solana:mainnet")
        // console.log("Sent NFT Tx:", sendNftTx)

        // ---------------------------------------------------------
        // Use the library method to get and parse incoming transfers
        // ---------------------------------------------------------
        let incomingTransfers = await wallet.getIncomingTransfers("solana:mainnet", 10)
        console.log("\nIncoming Transfers:")
        incomingTransfers.forEach(t => {
            console.log(" - Incoming Transfer Detected:")
            console.log("   Signature:", t.signature)
            console.log("   Slot:", t.slot)
            console.log("   Type:", t.type)
            console.log("   Amount:", t.amount, t.type === 'SOL' ? 'SOL' : 'tokens')
            console.log("   From:", t.from)
            console.log("   To:", t.to)
            if (t.tokenMint) {
                console.log("   Token Mint:", t.tokenMint)
            }
        })

    } catch(e) {
        console.error(e)
    }
}

run_test()
