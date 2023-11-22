const {getContract} = require("../contract/operation");
const {getRpc, getLang} = require("../init");
const {getPrivateKey} = require("../init");
const {getWallet} = require("../contract/operation");

const StorageProviderLendingPool = require('../contract/abi/StorageProviderLendingPool.json')
const StakingPool = require('../contract/abi/StakingPool.json')
const {contractParseCode} = require("../utils/common");
const {getContractAddress} = require("../init");
const ErrCode = require('../utils/ErrCode')
const ErrCodeCH = require('../utils/ErrCodeCH')
const {shortToLong} = require("../utils/Price");
const i18n = require('../i18n/i18n-config');
const CLI = require('clui'), Spinner = CLI.Spinner;
const {getFilecoinProvider} = require("../contract/operation");
let countdown = new Spinner('Loading...', ['◜', '◠', '◝', '◞', '◡', '◟']);


function parseError(e) {
    let code = contractParseCode(e)
    let msg
    let lang = getLang()
    if (lang === 'zh') {
        msg = ErrCodeCH[code]
    } else {
        msg = ErrCode[code]
    }
    if (!msg) {
        throw e
    }
    console.error(`Error: ${msg}`)
}

function _stakingPoolContract(walletAddress, encryptionKey) {
    let rpc = getRpc()
    let wallet = getWallet(getPrivateKey(walletAddress, encryptionKey), rpc);
    let stakingPoolContractAddress = getContractAddress(null, "stakingPool")
    return getContract(wallet, stakingPoolContractAddress, StakingPool.abi);
}

function _getPoolContract(poolAddress, walletAddress, encryptionKey) {
    let rpc = getRpc()
    let wallet = getWallet(getPrivateKey(walletAddress, encryptionKey), rpc);
    return getContract(wallet, poolAddress, StorageProviderLendingPool.abi);
}

async function waitTx(tx) {
    console.log(`${i18n.__('Transaction-hash')}: ${tx.hash}`)
    countdown.start();
    let res = await tx.wait();
    countdown.stop()
    console.log(`${i18n.__('Transaction-Successes')}!`)
    return res
}

function parseRateMode(rateMode) {
    if (rateMode === 'v') {
        return 2
    }
    return 1
}

async function sealLoan(poolAddress, nodeId, amount, rateMode, walletAddress, encryptionKey) {

    try {
        let tx
        if (!poolAddress) {
            tx = await _stakingPoolContract(walletAddress, encryptionKey).borrow(nodeId.substr(2), shortToLong(amount), rateMode)
        } else {
            tx = await _getPoolContract(poolAddress, walletAddress, encryptionKey).sealLoan(nodeId.substr(2), shortToLong(amount), rateMode)
        }
        await waitTx(tx)
    } catch (e) {
        countdown.stop()
        parseError(e)
    }

}

async function withdrawLoan(poolAddress, nodeId, amount, rateMode, walletAddress, encryptionKey) {

    let poolContract = _getPoolContract(poolAddress, walletAddress, encryptionKey);

    try {
        let tx = await poolContract.withdrawLoan(nodeId.substr(2), shortToLong(amount), rateMode)
        await waitTx(tx)
    } catch (e) {
        countdown.stop()
        parseError(e)
    }

}

async function repay(poolAddress, nodeId, amount, rateMode, walletAddress, encryptionKey) {
    let contract
    if (!poolAddress) {
        contract = _stakingPoolContract(walletAddress, encryptionKey)
    } else {
        contract = _getPoolContract(poolAddress, walletAddress, encryptionKey)
    }

    try {
        let tx = await contract.repay(nodeId.substr(2), shortToLong(amount), rateMode)
        await waitTx(tx)
    } catch (e) {
        parseError(e)
    }

}

async function repayWithCash(poolAddress, nodeId, amount, rateMode, walletAddress, encryptionKey) {

    let contract = _getPoolContract(poolAddress, walletAddress, encryptionKey)
    try {
        let tx = await contract.repayWithCash(nodeId.substr(2), rateMode, {value: shortToLong(amount)})
        await waitTx(tx)
    } catch (e) {
        parseError(e)
    }

}

async function withdraw(poolAddress, nodeId, amount, walletAddress, encryptionKey) {

    try {
        let tx
        if (poolAddress) {
            tx = await _getPoolContract(poolAddress, walletAddress, encryptionKey).withdrawProfits(nodeId.substr(2), shortToLong(amount))
        } else {
            tx = await _stakingPoolContract(walletAddress, encryptionKey).withdraw(nodeId.substr(2), shortToLong(amount))
        }
        await waitTx(tx)
    } catch (e) {
        parseError(e)
    }
}

const SLEEP_TIME = 60000

async function autoSealLoad(poolAddress, nodeId, amount, rateMode, walletAddress, encryptionKey, availableLt) {
    let rpc = getRpc()
    let filecoinProvider = getFilecoinProvider(rpc);
    await _autoSealLoad(filecoinProvider, poolAddress, nodeId, amount, rateMode, walletAddress, encryptionKey, availableLt)
}

async function _autoSealLoad(filecoinProvider, poolAddress, nodeId, amount, rateMode, walletAddress, encryptionKey, availableLt) {
    let now = new Date();
    console.log(`【${now.toLocaleDateString()} ${now.toLocaleTimeString()}】 ${i18n.__('wait-next-round')}...`)
    setTimeout(async () => {
        let stateReadState = await filecoinProvider.readState(nodeId)
        let {Balance} = stateReadState
        let {LockedFunds, InitialPledge} = stateReadState.State
        let availableBalance = BigInt(Balance) - BigInt(LockedFunds) - BigInt(InitialPledge)

        if (availableBalance < shortToLong(availableLt)) {
            let now = new Date();
            console.log(`【${now.toLocaleDateString()} ${now.toLocaleTimeString()}】 ${i18n.__('prepare-borrowing-under-10FIL').replace('xxx',availableGt).replace('kkk', amount)}`)
            await sealLoan(poolAddress, nodeId, amount, rateMode, walletAddress, encryptionKey)
        }
        _autoSealLoad(filecoinProvider, poolAddress, nodeId, amount, rateMode, walletAddress, encryptionKey, availableLt)
    }, SLEEP_TIME)
}

async function autoRepay(poolAddress, nodeId, amount, rateMode, walletAddress, encryptionKey, availableGt) {
    let rpc = getRpc()
    let filecoinProvider = getFilecoinProvider(rpc);
    await _autoRepay(filecoinProvider, poolAddress, nodeId, amount, rateMode, walletAddress, encryptionKey, availableGt)
}

async function _autoRepay(filecoinProvider, poolAddress, nodeId, amount, rateMode, walletAddress, encryptionKey, availableGt) {
    let now = new Date();
    console.log(`【${now.toLocaleDateString()} ${now.toLocaleTimeString()}】 ${i18n.__('wait-next-round')}...`)
    setTimeout(async () => {
        let stateReadState = await filecoinProvider.readState(nodeId)
        let {Balance} = stateReadState
        let {LockedFunds, InitialPledge} = stateReadState.State
        let availableBalance = BigInt(Balance) - BigInt(LockedFunds) - BigInt(InitialPledge)

        if (availableBalance > shortToLong(availableGt)) {
            let now = new Date();
            console.log(`【${now.toLocaleDateString()} ${now.toLocaleTimeString()}】 ${i18n.__('prepare-borrowing-over-10FIL').replace('xxx',availableGt).replace('kkk', amount)}`)
            await sealLoan(poolAddress, nodeId, amount, rateMode, walletAddress, encryptionKey)
        }
        _autoRepay(filecoinProvider, poolAddress, nodeId, amount, rateMode, walletAddress, encryptionKey, availableGt)
    }, SLEEP_TIME)
}

module.exports = {
    sealLoan,
    repay,
    withdraw,
    withdrawLoan,
    parseRateMode,
    repayWithCash,
    autoSealLoad,
    autoRepay
}
