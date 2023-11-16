const {getSTFILTokenContractAddress} = require("../init");
const {getContract} = require("../contract/operation");
const {getEnv} = require("../init");
const {longToShort} = require("../utils/Price");
const {getRpc, getLang} = require("../init");
const {getPrivateKey} = require("../init");
const {getWallet} = require("../contract/operation");
const VariableDebtToken = require('../contract/abi/VariableDebtToken.json')
const StableDebtToken = require('../contract/abi/StableDebtToken.json')
const StorageProviderLendingPool = require('../contract/abi/StorageProviderLendingPool.json')
const StakingPool = require('../contract/abi/StakingPool.json')
const STFILToken = require('../contract/abi/STFILToken.json')
const NodeConfiguration = require("../utils/NodeConfiguration");
const PercentageMath = require("../utils/PercentageMath");
const {contractParseCode} = require("../utils/common");
const {wad} = require("../utils/Price");
const {percent_wad} = require("../utils/Price");
const {getActorAddress} = require("../utils/common");
const {getContractAddress} = require("../init");
const {getFilecoinProvider} = require("../contract/operation");
const ErrCode = require('../utils/ErrCode')
const ErrCodeCH = require('../utils/ErrCodeCH')
const {shortToLong} = require("../utils/Price");
const i18n = require('../i18n/i18n-config');
const CLI = require('clui'), Spinner = CLI.Spinner;

let countdown = new Spinner('Loading...', ['◜', '◠', '◝', '◞', '◡', '◟']);

async function walletInfo(privateKey, net) {
    if (!privateKey) {
        privateKey = getPrivateKey()
    }
    let rpc = getRpc(net)
    let wallet = getWallet(privateKey, rpc);
    let address = await wallet.getAddress();
    let balance = await wallet.provider.getBalance(address)
    let contract = getContract(wallet, getSTFILTokenContractAddress(net), STFILToken.abi);
    let stfilBalance = await contract.balanceOf(address)

    console.log("net:", net ? net : getEnv())
    console.log('address:', address)
    console.log(`balance: ${longToShort(balance)} FIL`)
    console.log(`STFIL balance: ${longToShort(stfilBalance)} stFIL`)
}

async function nodeInfo(nodeId) {

    let rpc = getRpc()
    let provider = getFilecoinProvider(rpc);
    let stateReadState = await provider.readState(nodeId)
    let {Balance} = stateReadState
    let {LockedFunds, InitialPledge} = stateReadState.State
    let Available = BigInt(Balance) - BigInt(LockedFunds) - BigInt(InitialPledge)

    let stakingPoolContractAddress = getContractAddress(null, "stakingPool")

    let wallet = getWallet(getPrivateKey(), rpc);
    let variableDebtTokenContract = getContract(wallet, getContractAddress(null, "VariableDebtToken"), VariableDebtToken.abi);
    let stableDebtTokenContract = getContract(wallet, getContractAddress(null, "StableDebtToken"), StableDebtToken.abi);
    let stakingPoolContract = getContract(wallet, stakingPoolContractAddress, StakingPool.abi);

    let actorAddress = getActorAddress(nodeId)
    let variableDebtBalance = await variableDebtTokenContract.balanceOf(actorAddress)
    let stableDebtBalance = await stableDebtTokenContract.balanceOf(actorAddress)
    let Debt = variableDebtBalance + stableDebtBalance
    let Equity = BigInt(Balance) - Debt

    let nodeData = await stakingPoolContract.getNodeData(nodeId.substr(2))
    let configuration = nodeData[0]['configuration']['data']
    let nodeConfiguration = new NodeConfiguration(configuration)
    let liquidationThreshold = nodeConfiguration.getLiquidationThreshold();
    let maxLeverage = nodeConfiguration.getMaxLeverage();

    let maxBorrowableLiquidityAmount = await stakingPoolContract.maxBorrowableLiquidityAmount()

    let poolStFilBalance = await wallet.provider.getBalance(stakingPoolContractAddress)

    let availableBorrowingAmount = PercentageMath.mul(Equity, maxLeverage - 10000n) - Debt
    if (availableBorrowingAmount > poolStFilBalance) {
        availableBorrowingAmount = poolStFilBalance
    }
    if (availableBorrowingAmount > maxBorrowableLiquidityAmount) {
        availableBorrowingAmount = maxBorrowableLiquidityAmount
    }
    availableBorrowingAmount = availableBorrowingAmount < 0n ? 0n : availableBorrowingAmount
    let stableBorrowingAmount = PercentageMath.mul(poolStFilBalance, 2000n)
    stableBorrowingAmount = stableBorrowingAmount > availableBorrowingAmount ? availableBorrowingAmount : stableBorrowingAmount
    stableBorrowingAmount = stableBorrowingAmount < 0n ? 0n : stableBorrowingAmount
    if (stableBorrowingAmount > poolStFilBalance) {
        stableBorrowingAmount = poolStFilBalance
    }
    if (stableBorrowingAmount > maxBorrowableLiquidityAmount) {
        stableBorrowingAmount = maxBorrowableLiquidityAmount
    }

    console.log(`${i18n.__('position')}: ${longToShort(Balance)} FIL`)
    console.log(`${i18n.__('available')}: ${longToShort(Available)} FIL`)
    console.log(`${i18n.__('debt')}: ${longToShort(Debt)} FIL`)
    console.log(`${i18n.__('equity')}: ${longToShort(Equity)} FIL`)
    console.log(`${i18n.__('liquidationThreshold')}: ${percent_wad(liquidationThreshold)}%`)
    console.log(`${i18n.__('maxLeverage')}: ${wad(maxLeverage)}x`)
    console.log(`${i18n.__('maximum-Variable-Borrowing-Limit')}: ${longToShort(availableBorrowingAmount)} FIL`)
    console.log(`${i18n.__('maximum-Stable-Borrowing-Limit')}: ${longToShort(stableBorrowingAmount)} FIL`)
    console.log(`${i18n.__('Max-Borrowable-Liquidity-Amount')}: ${longToShort(maxBorrowableLiquidityAmount)} FIL`)

}

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

function _stakingPoolContract() {
    let rpc = getRpc()
    let wallet = getWallet(getPrivateKey(), rpc);
    let stakingPoolContractAddress = getContractAddress(null, "stakingPool")
    return getContract(wallet, stakingPoolContractAddress, StakingPool.abi);
}

function getPoolContract(poolAddress) {
    let rpc = getRpc()
    let wallet = getWallet(getPrivateKey(), rpc);
    return getContract(wallet, poolAddress, StorageProviderLendingPool.abi);
}

async function waitTx(tx) {
    console.log(`${i18n.__('Transaction-hash')}: ${tx.hash}`)
    countdown.start();
    await tx.wait();
    countdown.stop()
    console.log(`${i18n.__('Transaction-Successes')}!`)
}

async function sealLoan(poolAddress, nodeId, amount, rateMode) {

    try {
        let tx
        if (!poolAddress) {
            tx = await _stakingPoolContract().borrow(nodeId.substr(2), shortToLong(amount), rateMode)
        } else {
            tx = await getPoolContract(poolAddress).sealLoan(nodeId.substr(2), shortToLong(amount), rateMode)
        }
        await waitTx(tx)
    } catch (e) {
        countdown.stop()
        parseError(e)
    }

}

async function withdrawLoan(poolAddress, nodeId, amount, rateMode) {

    let poolContract = getPoolContract(poolAddress);

    try {
        let tx = await poolContract.withdrawLoan(nodeId.substr(2), shortToLong(amount), rateMode)
        await waitTx(tx)
    } catch (e) {
        countdown.stop()
        parseError(e)
    }

}

async function repay(poolAddress, nodeId, amount, rateMode) {
    let contract
    if (!poolAddress) {
        contract = _stakingPoolContract()
    } else {
        contract = getPoolContract(poolAddress)
    }

    try {
        let tx = await contract.repay(nodeId.substr(2), shortToLong(amount), rateMode)
        await waitTx(tx)
    } catch (e) {
        parseError(e)
    }

}

async function withdraw(poolAddress, nodeId, amount) {

    try {
        let tx
        if (poolAddress) {
            tx = await getPoolContract(poolAddress).withdrawProfits(nodeId.substr(2), shortToLong(amount))
        } else {
            tx = await _stakingPoolContract().withdraw(nodeId.substr(2), shortToLong(amount))
        }
        await waitTx(tx)
    } catch (e) {
        parseError(e)
    }
}


async function poolInfo(poolAddress) {

    let poolContract = getPoolContract(poolAddress);
    let admin = await poolContract.owner()
    let nodeCount = await poolContract.nodeCount()
    let classifyDebt = await poolContract.totalClassifyDebt()
    let totalDebt = classifyDebt[0] + classifyDebt[1]
    let maxSealLoadLeverage = await poolContract.maxSealLoadLeverage()
    let maxWithdrawLoadLeverage = await poolContract.maxWithdrawLoadLeverage()
    let withdrawLoadTotalAmount = await poolContract.withdrawLoadTotalAmount()
    let totalPosition = await poolContract.totalPosition()
    let totalEntity = await poolContract.totalEntity()

    console.log(`${i18n.__('admin')}: ${admin}`)
    console.log(`${i18n.__('nodeCount')}: ${nodeCount}`)
    console.log(`${i18n.__('debt')}: ${longToShort(totalDebt)} FIL`)
    console.log(`${i18n.__('maxSealLoadLeverage')}: ${longToShort(maxSealLoadLeverage)}x`)
    console.log(`${i18n.__('maxWithdrawLoadLeverage')}: ${longToShort(maxWithdrawLoadLeverage)}x`)
    console.log(`${i18n.__('withdrawLoadTotalAmount')}: ${longToShort(withdrawLoadTotalAmount)} FIL`)
    console.log(`${i18n.__('totalPosition')}: ${longToShort(totalPosition)} FIL`)
    console.log(`${i18n.__('totalEntity')}: ${longToShort(totalEntity)} FIL`)

}

async function poolNodeInfo(poolAddress, nodeId) {

    let actorId = nodeId.toString().substr(2)
    let poolContract = getPoolContract(poolAddress);
    let classifyDebt = await poolContract.classifyDebt(actorId)
    let variableDebtBalance = classifyDebt[1]
    let stableDebtBalance = classifyDebt[0]
    let debt = variableDebtBalance + stableDebtBalance
    let withdrawLoadAmount = await poolContract.withdrawLoadAmount(actorId)
    let maxWithdrawLoanAmount = await poolContract.maxWithdrawLoanAmount(actorId)
    let nodeOwner = await poolContract.nodeOwner(actorId)
    let entity = await poolContract.entity(actorId)
    let maxSealedLoadAmount = await poolContract.maxSealedLoadAmount()

    let stakingPoolContract = _stakingPoolContract()
    let maxBorrowableLiquidityAmount = await stakingPoolContract.maxBorrowableLiquidityAmount()
    if (maxWithdrawLoanAmount > maxBorrowableLiquidityAmount) {
        maxWithdrawLoanAmount = maxBorrowableLiquidityAmount
    }
    if (maxSealedLoadAmount > maxBorrowableLiquidityAmount) {
        maxSealedLoadAmount = maxBorrowableLiquidityAmount
    }

    let rpc = getRpc()
    let provider = getFilecoinProvider(rpc);
    let stateReadState = await provider.readState(nodeId)
    let {Balance} = stateReadState
    let {LockedFunds, InitialPledge} = stateReadState.State
    let Available = BigInt(Balance) - BigInt(LockedFunds) - BigInt(InitialPledge)
    console.log(`${i18n.__('position')}: ${longToShort(Balance)} FIL`)
    console.log(`${i18n.__('available')}: ${longToShort(Available)} FIL`)
    console.log(`${i18n.__('debt')}: ${longToShort(debt)} FIL`)
    console.log(`${i18n.__('withdrawLoadAmount')}: ${longToShort(withdrawLoadAmount)} FIL`)
    console.log(`${i18n.__('maxSealedLoadAmount')}: ${longToShort(maxSealedLoadAmount)} FIL`)
    console.log(`${i18n.__('maxWithdrawLoanAmount')}: ${longToShort(maxWithdrawLoanAmount)} FIL`)
    console.log(`${i18n.__('Max-Borrowable-Liquidity-Amount')}: ${longToShort(maxBorrowableLiquidityAmount)} FIL`)
    console.log(`${i18n.__('equity')}: ${longToShort(entity)} FIL`)
    console.log(`${i18n.__('nodeOwner')}: f0${parseInt(nodeOwner.toString().replace("0xff", ""), 16)}`)

}

async function poolNodes(poolAddress) {

    let poolContract = getPoolContract(poolAddress);
    let nodeCount = await poolContract.nodeCount()
    for (let i = 0; i < nodeCount; i++) {
        let nodeId = await poolContract.node(i)
        console.log(`${i + 1}: f0${nodeId}`)
    }

}

module.exports = {walletInfo, nodeInfo, sealLoan, repay, withdraw, poolNodes, poolInfo, poolNodeInfo, withdrawLoan}
