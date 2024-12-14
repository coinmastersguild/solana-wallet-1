require('dotenv')
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

        // get token balance (example: USDC mint on mainnet)
        // USDC Mint on mainnet: 9vMJfxuKxXBoEa7rM12mYLMwTacLMLDJqHozw96WQL8i
        // let tokenBalance = await wallet.getTokenBalance("9vMJfxuKxXBoEa7rM12mYLMwTacLMLDJqHozw96WQL8i", "solana:mainnet")
        // console.log("USDC Token Balance:", tokenBalance)

        let tokenBalance = await wallet.getTokenBalance("5gVSqhk41VA8U6U4Pvux6MSxFWqgptm3w58X9UTGpump", "solana:mainnet")
        console.log("CLUBMOON Token Balance:", tokenBalance)

        // get NFTs
        let nfts = await wallet.getNfts("solana:mainnet")
        console.log("NFT Count:", nfts.length)
        // If you have NFTs, you can see them:
        nfts.forEach((nft, i) => {
            console.log(`NFT #${i+1}: ${nft.name} (${nft.address.toBase58()})`)
        })

        // send Solana (uncomment if you want to actually send; be sure you have enough SOL!)
        // let sendSolTx = await wallet.sendSol("5RU2erdSLHU8oVEFVK82KCoTSpZt7a6J6gyXcfRVUj5v", 0.0001)
        // console.log("Sent SOL Tx:", sendSolTx)

        // send Token (again, be cautious and ensure you have these tokens)
        // let sendTokenTx = await wallet.sendToken("5gVSqhk41VA8U6U4Pvux6MSxFWqgptm3w58X9UTGpump", "5RU2erdSLHU8oVEFVK82KCoTSpZt7a6J6gyXcfRVUj5v", 1, "solana:mainnet", true)
        // console.log("Sent Token Tx:", sendTokenTx)

        // send NFT (be very careful, ensure you have the NFT in your wallet)
        // let sendNftTx = await wallet.sendNft("NftMintAddressHere", "RecipientPublicKeyHere")
        // console.log("Sent NFT Tx:", sendNftTx)

    } catch(e) {
        console.error(e)
    }
}

run_test()
