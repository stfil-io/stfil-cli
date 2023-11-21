const {getActorAddress} = require("../utils/common");
const {getContract} = require("../contract/operation");
const {getProvider} = require("../contract/operation");
const {getContractAddress} = require("../init");
const {getRpc} = require("../init");
const {getFilecoinProvider} = require("../contract/operation");
const {initConfig} = require("../init");
const {getConfigWallet} = require("../init");
const {getConfigSplp} = require("../init");
const {getConfigPool} = require("../init");
const VariableDebtToken = require('../contract/abi/VariableDebtToken.json')
const StableDebtToken = require('../contract/abi/StableDebtToken.json')
const StakingPool = require('../contract/abi/StakingPool.json')
const NodeConfiguration = require("../utils/NodeConfiguration");
const PercentageMath = require("../utils/PercentageMath");
const i18n = require("../i18n/i18n-config");
const {wad} = require("../utils/Price");
const {percent_wad} = require("../utils/Price");
const {longToShort} = require("../utils/Price");
const StorageProviderLendingPool = require('../contract/abi/StorageProviderLendingPool.json')
const {getEnv} = require("../init");
const {getConfig} = require("../init");

async function poolList() {
    let pool = getConfigPool();
    let poolType = Object.keys(pool);
    let table = [];
    for (let typeIndex in poolType) {

        let type = poolType[typeIndex]
        for (let index in pool[type]) {
            table.push({
                "Type": type,
                "ID": index,
                "Address": pool[type][index]['address'],
                "Admin": pool[type][index]['admin'],
                "default": pool[type][index]['default']
            })
        }
    }

    console.table(table)
}

async function setDefault(poolAddress) {
    let splp = getConfigSplp()
    let index = splp.findIndex(item => item['address'].toString().toLowerCase() === poolAddress.toString().toLowerCase())
    if (index < 0) {
        console.error(`Error: 该借贷池不存在`)
        return
    }

    let defaultIndex = splp.findIndex(item => item['default'])
    if (defaultIndex >= 0) {
        splp[defaultIndex]['default'] = false
    }

    splp[index]['default'] = true

    let config = getConfig()
    config[getEnv()]['pool']['splp'] = splp
    initConfig(config)
}

async function addPool(poolAddress) {

    let splp = getConfigSplp()
    if (splp.findIndex(item => item['address'].toString().toLowerCase() === poolAddress.toString().toLowerCase()) >= 0) {
        console.error(`Error: 该借贷池已存在`)
        return
    }

    let walletList = getConfigWallet();
    let addressList = walletList.map(item => item['address'].toString().toLowerCase())
    let poolAdmin = await getPoolAdmin(poolAddress)
    if (addressList.indexOf(poolAdmin.toString().toLowerCase()) < 0) {
        console.error(`Error: 该借贷池的管理员不存在你的钱包地址`)
        return
    }
    splp.push({
        "address": poolAddress,
        "admin": poolAdmin,
        "default": splp.length === 0
    })

    let config = getConfig()
    config[getEnv()]['pool']["splp"] = splp

    initConfig(config)
}


async function delPool(poolAddress) {

    let splp = getConfigSplp()
    let findIndex = splp.findIndex(item => item['address'].toString().toLowerCase() === poolAddress.toString().toLowerCase());
    if (findIndex < 0) {
        return
    }

    splp.splice(findIndex, 1)
    let config = getConfig()
    config[getEnv()]['pool']["splp"] = splp

    initConfig(config)
}

async function nodeInfo(nodeId) {

    let rpc = getRpc()
    let filecoinProvider = getFilecoinProvider(rpc);
    let stateReadState = await filecoinProvider.readState(nodeId)
    let {Balance} = stateReadState
    let {LockedFunds, InitialPledge} = stateReadState.State
    let Available = BigInt(Balance) - BigInt(LockedFunds) - BigInt(InitialPledge)

    let stakingPoolContractAddress = getContractAddress(null, "stakingPool")

    let provider = getProvider(rpc)
    let variableDebtTokenContract = getContract(provider, getContractAddress(null, "VariableDebtToken"), VariableDebtToken.abi);
    let stableDebtTokenContract = getContract(provider, getContractAddress(null, "StableDebtToken"), StableDebtToken.abi);
    let stakingPoolContract = getContract(provider, stakingPoolContractAddress, StakingPool.abi);

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

    let poolStFilBalance = await provider.getBalance(stakingPoolContractAddress)

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


async function getPoolAdmin(poolAddress, env) {

    let rpc = getRpc(env)
    let provider = getProvider(rpc)
    let poolContract = getContract(provider, poolAddress, StorageProviderLendingPool.abi);
    return await poolContract.owner()

}

async function poolInfo(poolAddress) {
    let rpc = getRpc()
    let provider = getProvider(rpc)
    let poolContract = getContract(provider, poolAddress, StorageProviderLendingPool.abi);
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

    let rpc = getRpc()
    let provider = getProvider(rpc)
    let poolContract = getContract(provider, poolAddress, StorageProviderLendingPool.abi);

    let classifyDebtPromise = poolContract.classifyDebt(actorId)
    let withdrawLoadAmountPromise = poolContract.withdrawLoadAmount(actorId)
    let maxWithdrawLoanAmountPromise = poolContract.maxWithdrawLoanAmount(actorId)
    let nodeOwnerPromise = poolContract.nodeOwner(actorId)
    let entityPromise = poolContract.entity(actorId)
    let maxSealedLoadAmountPromise = poolContract.maxSealedLoadAmount()

    let stakingPoolContractAddress = getContractAddress(null, "stakingPool")
    let stakingPoolContract = getContract(provider, stakingPoolContractAddress, StakingPool.abi);

    let maxBorrowableLiquidityAmountPromise = stakingPoolContract.maxBorrowableLiquidityAmount()
    let filecoinProvider = getFilecoinProvider(rpc);
    let stateReadStatePromise = filecoinProvider.readState(nodeId)

    let promiseAll = await Promise.all([classifyDebtPromise, withdrawLoadAmountPromise, maxWithdrawLoanAmountPromise, nodeOwnerPromise, entityPromise, maxSealedLoadAmountPromise, maxBorrowableLiquidityAmountPromise, stateReadStatePromise])

    let classifyDebt = promiseAll[0]
    let variableDebtBalance = classifyDebt[1]
    let stableDebtBalance = classifyDebt[0]
    let debt = variableDebtBalance + stableDebtBalance
    let withdrawLoadAmount = promiseAll[1]
    let maxWithdrawLoanAmount = promiseAll[2]
    let nodeOwner = promiseAll[3]
    let entity = promiseAll[4]
    let maxSealedLoadAmount = promiseAll[5]

    let maxBorrowableLiquidityAmount = promiseAll[6]
    if (maxWithdrawLoanAmount > maxBorrowableLiquidityAmount) {
        maxWithdrawLoanAmount = maxBorrowableLiquidityAmount
    }
    if (maxSealedLoadAmount > maxBorrowableLiquidityAmount) {
        maxSealedLoadAmount = maxBorrowableLiquidityAmount
    }

    let stateReadState = promiseAll[7]
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
    let rpc = getRpc()
    let provider = getProvider(rpc)
    let poolContract = getContract(provider, poolAddress, StorageProviderLendingPool.abi);
    let nodeCount = await poolContract.nodeCount()
    for (let i = 0; i < nodeCount; i++) {
        let nodeId = await poolContract.node(i)
        console.log(`${i + 1}: f0${nodeId}`)
    }
}

module.exports = {
    nodeInfo,
    poolList,
    addPool,
    delPool,
    poolNodes,
    poolNodeInfo,
    poolInfo,
    getPoolAdmin,
    setDefault,
}
