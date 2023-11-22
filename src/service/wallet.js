const {initConfig} = require("../init");
const {getConfigWallet} = require("../init");
const {longToShort} = require("../utils/Price");
const {getContract} = require("../contract/operation");
const {getSTFILTokenContractAddress} = require("../init");
const {getProvider} = require("../contract/operation");
const {getRpc} = require("../init");
const STFILToken = require('../contract/abi/STFILToken.json')
const i18n = require("../i18n/i18n-config");
const {SK} = require("../utils/common");
const {encrypt} = require("../utils/common");
const {getWallet} = require("../contract/operation");

async function walletInfo(address) {
    let rpc = getRpc()
    let provider = getProvider(rpc)
    let balance = await provider.getBalance(address)
    let contract = getContract(provider, getSTFILTokenContractAddress(), STFILToken.abi);
    let stfilBalance = 0n
    try {
        stfilBalance = await contract.balanceOf(address)
    } catch (e) {
    }

    console.log('address:', address)
    console.log(`balance: ${longToShort(balance)} FIL`)
    console.log(`STFIL balance: ${longToShort(stfilBalance)} stFIL`)
}

async function walletList() {
    let walletList = getConfigWallet();
    let table = [];
    for (let index in walletList) {
        table.push({
            "Address": walletList[index]['address'],
            "Need Password": walletList[index]['isPassword']
        })
    }
    console.table(table)
}

async function addWallet(isPassword, encryptionKey, privateKey, address) {
    let walletList = getConfigWallet();
    if (walletList.findIndex(item => item['address'].toString().toLowerCase() === address.toString().toLowerCase()) >= 0) {
        console.error(`Error: ${i18n.__('wallet-exists')}`)
        return
    }
    walletList.push({
        address,
        isPassword,
        privateKey: privateKey ? encrypt(privateKey, isPassword ? encryptionKey : SK) : null
    })
    let config = {
        wallet: walletList
    }
    initConfig(config)
}

async function delWallet(address) {
    let walletList = getConfigWallet();
    let index = walletList.findIndex(item => item['address'].toString().toLowerCase() === address.toString().toLowerCase())
    if (index < 0) {
        console.error(`Error: ${i18n.__('wallet-not-exist')}`)
        return
    }

    walletList.splice(index, 1)
    let config = {
        wallet: walletList
    }
    initConfig(config)
}

async function getWalletAddress(privateKey, env) {
    let rpc = getRpc(env)
    let wallet = getWallet(privateKey, rpc)
    return await wallet.getAddress()
}

module.exports = {
    getWalletAddress,
    addWallet,
    walletList,
    walletInfo,
    delWallet
}
