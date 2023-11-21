#!/usr/bin/env node
const {encrypt, SK} = require("./src/utils/common");

const {Command, Option} = require('commander');
const figlet = require('figlet');
const {select, password} = require('@inquirer/prompts');
const program = new Command();
const i18n = require('./src/i18n/i18n-config');
const {isAddress} = require("ethers");
const {configFilePath} = require("./src/init");
const {getConfig} = require("./src/init");
const {isInit} = require("./src/init");
const {initConfig, init} = require("./src/init");
const packageJson = require('./package.json');
const {autoRepay} = require("./src/service/splp");
const {autoSealLoad} = require("./src/service/splp");
const {repayWithCash} = require("./src/service/splp");
const {getEnv} = require("./src/init");
const {getSplp} = require("./src/init");
const {parseRateMode} = require("./src/service/splp");
const {setDefault} = require("./src/service/pool");
const {getConfigSplp} = require("./src/init");
const {delWallet} = require("./src/service/wallet");
const {withdraw} = require("./src/service/splp");
const {repay} = require("./src/service/splp");
const {withdrawLoan} = require("./src/service/splp");
const {sealLoan} = require("./src/service/splp");
const {poolNodes} = require("./src/service/pool");
const {poolNodeInfo} = require("./src/service/pool");
const {poolInfo} = require("./src/service/pool");
const {delPool} = require("./src/service/pool");
const {addPool} = require("./src/service/pool");
const {poolList} = require("./src/service/pool");
const {walletInfo} = require("./src/service/wallet");
const {addWallet} = require("./src/service/wallet");
const {walletList} = require("./src/service/wallet");
const {getPoolAdmin} = require("./src/service/pool");
const {getWalletAddress} = require("./src/service/wallet");
const {getConfigWallet} = require("./src/init");
const {input} = require("@inquirer/prompts");
const {isPassword} = require("./src/init");
const {exec} = require('child_process');

init()

let logo = figlet.textSync('STFIL CLI', {
    font: 'Big',
})

program
    .name('stfil-cli')
    .description(logo + '\nSTFIL Contract Execution Tool')
    .version('1.1.1')

const passwordRegex = /^[A-Za-z0-9!@#$%^&*(),.?":{}|<>]{8,20}$/;

async function checkWalletIsPassword(address) {
    let isP = isPassword(address)
    let encryptionKey
    if (isP) {
        encryptionKey = await password({
            message: i18n.__('Enter-encryption-password'),
        })
    }
    return encryptionKey
}

async function _init(options, isNeedAdd = false) {
    console.log(logo)
    let language = await select({
        message: i18n.__("select-language"),
        choices: [
            {name: '中文', value: 'zh',},
            {name: 'English', value: 'en'},
        ],
    })

    i18n.setLocale(language);
    let env = await select({
        message: i18n.__("select-net"),
        choices: [
            {name: 'Main', value: 'Main',},
            {name: 'Calibration', value: 'Calibration'},
        ],
    })

    let walletInfos = []
    let splp = []
    let config = {
        language,
        env,
        wallet: walletInfos,
    }
    config[env] = {
        pool: {
            splp
        }
    }

    initConfig(config, !!options.force)
    let isAddWallet = true
    if (!isNeedAdd) {
        isAddWallet = await select({
            message: "是否现在添加钱包和借贷池",
            choices: [
                {name: 'Yes', value: true,},
                {name: 'No', value: false},
            ],
        })
    }

    let privateKey
    let address
    if (isAddWallet) {

        let isPassword = await select({
            message: i18n.__('Whether-the-wallet-private'),
            choices: [
                {name: 'Yes', value: true,},
                {name: 'No', value: false},
            ],
        })
        let encryptionKey = null
        if (isPassword) {
            let isValid = false
            while (!isValid) {
                encryptionKey = await password({
                    message: i18n.__('Enter-password-tip'),
                    mask: '*',
                })
                isValid = passwordRegex.test(encryptionKey);
                if (!isValid) {
                    console.log(i18n.__('Enter-password-tip-2'))
                } else {
                    break
                }
            }
        }

        while (true) {
            privateKey = await password({
                message: i18n.__("input-privateKey"),
                mask: '*',
            })
            try {
                address = await getWalletAddress(privateKey)
                break
            } catch (e) {
                console.error('Error: 请输入正确的私钥', e)
            }
        }

        walletInfos.push({
            address,
            isPassword,
            privateKey: privateKey ? encrypt(privateKey, isPassword ? encryptionKey : SK) : null
        })
    }
    let isAddLendingPool = false

    if (isAddWallet) {

        if (isNeedAdd) {
            isAddLendingPool = true
        } else {
            isAddLendingPool = await select({
                message: "是否现在添加借贷池",
                choices: [
                    {name: 'Yes', value: true,},
                    {name: 'No', value: false},
                ],
            })
        }

    }

    let lendingPoolAddress
    let poolAdmin
    if (isAddLendingPool && isAddWallet) {
        while (true) {
            lendingPoolAddress = await input({
                message: `请输入借贷池地址`,
                validate: (address) => {
                    return isAddress(address)
                }
            })
            try {
                poolAdmin = await getPoolAdmin(lendingPoolAddress, env)
                if (poolAdmin.toString().toLowerCase() !== address.toString().toLowerCase()) {
                    console.error(`Error: 该借贷池的管理员不是你的钱包地址`)
                } else {
                    break
                }
            } catch (e) {
                console.error('Error: 请输入正确的地址')
            }
        }

        splp.push({
            address: lendingPoolAddress,
            admin: poolAdmin,
            default: true
        })
    }

    config['wallet'] = walletInfos
    config[env] = {
        pool: {
            splp
        }
    }
    console.log(`${i18n.__("config-created")} "${initConfig(config, !!options.force)}"`)
    init()
}

program.command('init')
    .description(i18n.__('Initializer-Configuration'))
    .option('-f, --force', i18n.__('Init-Config-With-Default'))
    .action(async (options) => {
        await _init(options)
    })

const configCommand = program
    .command('config')
    .description(i18n.__('Project-Config'))
    .hook('preAction', () => {
        initCheck()
    })

function initCheck() {
    if (!isInit()) {
        console.log(`${i18n.__('Config-File-NotFound-Initialize-First')}\nstfil init`)
        process.exit(1)
    }
}

configCommand
    .command("get-env")
    .description("获取当前网络环境")
    .action(async () => {
        console.log(getEnv())
    });

configCommand
    .command("set-env")
    .description("设置当前网络环境")
    .action(async () => {
        let env = await select({
            message: "请选择网络",
            choices: [
                {name: 'Main', value: 'Main',},
                {name: 'Calibration', value: 'Calibration'},
            ],
        })

        let config = {
            env,
        }
        initConfig(config)
    });

configCommand
    .command("view")
    .description(i18n.__('View-Current-Config'))
    .action(() => {
        let config = getConfig()
        console.log(config);
    });

configCommand
    .command("path")
    .description(i18n.__('View-Current-Config-Path'))
    .action(() => {
        console.log(configFilePath)
    });

const walletCommand = program
    .command('wallet')
    .description(i18n.__('Wallet-Ops'))
    .hook('preAction', () => {
        initCheck()
    })

walletCommand
    .command("list")
    .description(i18n.__('Get-Wallet-Info'))
    .action(async () => {
        walletList()
    })

walletCommand
    .command("add")
    .description("添加钱包")
    .action(async () => {
        let isPassword = await select({
            message: i18n.__('Whether-the-wallet-private'),
            choices: [
                {name: 'Yes', value: true,},
                {name: 'No', value: false},
            ],
        })
        let encryptionKey = null
        let privateKey
        let address
        if (isPassword) {
            let isValid = false
            while (!isValid) {
                encryptionKey = await password({
                    message: i18n.__('Enter-password-tip'),
                    mask: '*',
                })
                isValid = passwordRegex.test(encryptionKey);
                if (!isValid) {
                    console.log(i18n.__('Enter-password-tip-2'))
                } else {
                    break
                }
            }
        }

        while (true) {
            privateKey = await password({
                message: i18n.__("input-privateKey"),
                mask: '*',
            })
            try {
                address = await getWalletAddress(privateKey)
                break
            } catch (e) {
                console.error('Error: 请输入正确的私钥', e)
            }
        }

        addWallet(isPassword, encryptionKey, privateKey, address)
    })

async function selectWallet(index) {
    let walletList = getConfigWallet();
    if (index !== undefined) {
        index = parseInt(index)
        if (index >= walletList.length) {
            console.log(`Error: 钱包序列号最大为${walletList.length - 1}`)
            process.exit(1)
        }
        return walletList[index]['address']
    }
    index = 0
    let choices = walletList.map(item => {
        return {
            name: `${index++}  ${item['address']}`,
            value: item['address']
        }
    })

    return await select({
        message: "选择钱包",
        choices,
    })
}

async function selectSplpPoolList(selectIndex) {
    let splp = getConfigSplp()
    if (selectIndex !== undefined) {
        return getSplp(selectIndex)['address']
    }
    let index = 0
    let choices = splp.map(item => {
        return {
            name: `${index++}  ${item['address']}`,
            value: item['address']
        }
    })

    return await select({
        message: "选择借贷池",
        choices,
    })
}

walletCommand
    .command("del")
    .option("-i,--index <index>", "本地钱包序列号")
    .description("删除钱包")
    .action(async (options) => {
        let selectAddress = await selectWallet(options.index)
        delWallet(selectAddress)
    })

walletCommand
    .command("info")
    .option("-a,--address <address>", "任意钱包地址")
    .option("-i,--index <index>", "本地钱包序列号")
    .description("获取钱包信息")
    .action(async (options) => {
        if (options.address) {
            checkAddress(options.address)
            walletInfo(options.address)
            return
        }
        let selectAddress = await selectWallet(options.index)
        walletInfo(selectAddress)

    })

const splpCommand = program.command('splp')
    .description(i18n.__('Lending-Pool'))
    .hook('preAction', (thisCommand, actionCommand) => {
        let action = actionCommand.name()
        if (action !== "autoSealLoad" && action !== "autoRepay" && action !== "autoAction") {
            initCheck()
        }
    })

function checkNodeId(nodeId) {
    if (!nodeId.startsWith('f0')) {
        console.error(`Error: ${i18n.__('NodeId-StartsWith-f0')}`);
        process.exit(1);
    }
}

function checkNumber(amount) {
    if (isNaN(amount)) {
        console.error('error: option \'-a,--amount <amount>\' is required. Must be a number.');
        process.exit(1); // 退出程序
    }
}

function checkAddress(address) {
    if (!isAddress(address)) {
        console.error('error: address is invalid.');
        process.exit(1); // 退出程序
    }
}

function confirmationOperation(message, okCall, force = false,) {
    if (force) {
        okCall()
        return
    }
    select({
        message,
        choices: [
            {name: 'Yes', value: 'yes'},
            {name: 'No', value: 'no'},
        ],
    }).then(answer => {
        if (answer === 'yes') {
            okCall()
        }
    })
}

splpCommand.command('list')
    .description("借贷池列表")
    .action(() => {
        poolList()
    })

splpCommand.command('add <poolAddress>')
    .description("添加借贷池")
    .action(async (poolAddress) => {
        checkAddress(poolAddress)
        addPool(poolAddress)
    })

splpCommand.command('del <poolAddress>')
    .description("删除借贷池")
    .action((poolAddress) => {
        delPool(poolAddress)
    })


function getPoolAddressByOptions(options, needLocal = false) {
    if (options.address || options.pool) {
        if (needLocal) {
            let splp = getConfigSplp()
            let index = splp.findIndex(item => item['address'].toString().toLowerCase() === options.address)
            if (index < 0) {
                console.error('Error: 找不到该借贷池，请手动添加\nstfil-cli splp add')
                process.exit(1)
            }
            return splp[index]
        } else {
            return {
                "address": options.address
            }
        }
    } else {
        return getSplp(options.index)
    }
}

splpCommand.command('set-default')
    .option("-a,--address <address>", '借贷池地址')
    .option("-i,--index <index>", '借贷池ID')
    .description("设置默认借贷池")
    .action(async (options) => {
        let poolAddress
        if (options.address) {
            poolAddress = options.address
        } else if (options.index !== undefined) {
            poolAddress = await selectSplpPoolList(options.index)
        } else {
            poolAddress = await selectSplpPoolList()
        }
        setDefault(poolAddress)
    })

splpCommand.command('info')
    .option("-a,--address <address>", '任意借贷池地址')
    .option("-i,--index <index>", '借贷池ID')
    .description(i18n.__('Lending-Pool-Info'))
    .action(async (options) => {
        let poolAddress = getPoolAddressByOptions(options)['address']
        poolInfo(poolAddress)
    })

const nodeCommand = splpCommand.command('node')
    .description("节点操作")

nodeCommand.command('list')
    .option("-a,--address <address>", '任意借贷池地址')
    .option("-i,--index <index>", '借贷池ID')
    .description(i18n.__('Lending-Pool-Node-List'))
    .action((options) => {
        let poolAddress = getPoolAddressByOptions(options)['address']
        poolNodes(poolAddress)
    })

nodeCommand.command('info <nodeId>')
    .option("-a,--address <address>", '任意借贷池地址')
    .option("-i,--index <index>", '借贷池ID')
    .description(i18n.__('Lending-Pool-Node-Info'))
    .action(async (nodeId, options) => {
        let poolAddress = getPoolAddressByOptions(options)['address']
        checkNodeId(nodeId)
        poolNodeInfo(poolAddress, nodeId)
    })

nodeCommand.command('sealLoan <nodeId>')
    .addOption(new Option("-p,--pool <address>", "借贷池地址"))
    .addOption(new Option("-a,--amount <amount>", "数量"))
    .addOption(new Option('-r,--rateMode <type>', i18n.__('Loan-Type-Stable-Floating')).default("v").choices(["r", "v"]))
    .option("-f, --force", i18n.__('Enforcement-inquiries'))
    .description(i18n.__('Loan-Seal'))
    .action(async (nodeId, options) => {
        checkNodeId(nodeId)
        let amount = options.amount
        checkNumber(amount)
        let {address, admin} = getPoolAddressByOptions(options, true)
        let poolAddress = address
        let encryptionKey = await checkWalletIsPassword(admin)
        confirmationOperation(`${i18n.__('Is-this-the-operation-you-want')}\n${i18n.__('Lending-Pool-Address')}: ${poolAddress}\n发起操作钱包地址: ${admin}\n${i18n.__('Node-ID')} ${nodeId} \n${i18n.__('Loan-Type')}: ${options.rateMode.toString() === 'r' ? i18n.__('Stable-Interest-Rate') : i18n.__('Variable-Interest-Rate')}\n${i18n.__('Loan-Seal-Amount')}: ${amount} FIL`,
            () => {
                sealLoan(poolAddress, nodeId, amount, parseRateMode(options.rateMode), admin, encryptionKey)
            }, options.force)
    })

nodeCommand.command('withdrawLoan <nodeId>')
    .addOption(new Option("-p,--pool <address>", "借贷池地址"))
    .addOption(new Option("-a,--amount <amount>", "数量"))
    .addOption(new Option('-r,--rateMode <type>', i18n.__('Loan-Type-Stable-Floating')).default("v").choices(["r", "v"]))
    .option("-f, --force", i18n.__('Enforcement-inquiries'))
    .description(i18n.__('Loan-Withdrawal'))
    .action(async (nodeId, options) => {
        checkNodeId(nodeId)
        let amount = options.amount
        checkNumber(amount)
        let {address, admin} = getPoolAddressByOptions(options, true)
        let poolAddress = address
        let encryptionKey = await checkWalletIsPassword(admin)
        confirmationOperation(`${i18n.__('Is-this-the-operation-you-want')}\n${i18n.__('Lending-Pool-Address')}: ${poolAddress}\n发起操作钱包地址: ${admin}\n${i18n.__('Node-ID')} ${nodeId} \n${i18n.__('Loan-Type')}: ${options.rateMode.toString() === 'r' ? i18n.__('Stable-Interest-Rate') : i18n.__('Variable-Interest-Rate')}\n${i18n.__('Loan-Withdrawal-Amount')}: ${amount} FIL`,
            () => {
                withdrawLoan(poolAddress, nodeId, amount, parseRateMode(options.rateMode), admin, encryptionKey)
            }, options.force)
    })

nodeCommand.command('repay <nodeId>')
    .addOption(new Option("-p,--pool <address>", "借贷池地址"))
    .addOption(new Option("-a,--amount <amount>", "数量"))
    .addOption(new Option('-r,--rateMode <type>', i18n.__('Loan-Type-Stable-Floating')).default("v").choices(["r", "v"]))
    .option("-f, --force", i18n.__('Enforcement-inquiries'))
    .description(i18n.__('Repayment'))
    .action(async (nodeId, options) => {
        checkNodeId(nodeId)
        let amount = options.amount
        checkNumber(amount)
        let {address, admin} = getPoolAddressByOptions(options, true)
        let poolAddress = address
        let encryptionKey = await checkWalletIsPassword(admin)
        confirmationOperation(`${i18n.__('Is-this-the-operation-you-want')}\n${i18n.__('Lending-Pool-Address')}: ${poolAddress}\n发起操作钱包地址: ${admin}\n${i18n.__('Node-ID')} ${nodeId} \n${i18n.__('Repay-Type')}: ${options.rateMode.toString() === 'r' ? i18n.__('Stable-Interest-Rate') : i18n.__('Variable-Interest-Rate')}\n${i18n.__('repay-Amount')}: ${amount} FIL`,
            () => {
                repay(poolAddress, nodeId, amount, parseRateMode(options.rateMode), admin, encryptionKey)
            }, options.force)
    })

nodeCommand.command('withdraw <nodeId>')
    .addOption(new Option("-p,--pool <address>", "借贷池地址"))
    .addOption(new Option("-a,--amount <amount>", "数量"))
    .option("-f, --force", i18n.__('Enforcement-inquiries'))
    .description(i18n.__('Withdraw-To-Owner'))
    .action(async (nodeId, options) => {
        checkNodeId(nodeId)
        let amount = options.amount
        checkNumber(amount)
        let {address, admin} = getPoolAddressByOptions(options, true)
        let poolAddress = address
        let encryptionKey = await checkWalletIsPassword(admin)

        confirmationOperation(`${i18n.__('Is-this-the-operation-you-want')}\n${i18n.__('Lending-Pool-Address')}: ${poolAddress}\n发起操作钱包地址: ${admin}\n${i18n.__('Node-ID')} ${nodeId} \n${i18n.__('withdraw-Amount')}: ${amount} FIL`,
            () => {
                withdraw(poolAddress, nodeId, amount, admin, encryptionKey)
            }, options.force)
    })

nodeCommand.command('repayWithCash <nodeId>')
    .addOption(new Option("-p,--pool <address>", "借贷池地址"))
    .option("-wa,--walletAddress <address>", "钱包地址")
    .addOption(new Option("-a,--amount <amount>", "数量"))
    .addOption(new Option('-r,--rateMode <type>', i18n.__('Loan-Type-Stable-Floating')).default("v").choices(["r", "v"]))
    .option("-f, --force", i18n.__('Enforcement-inquiries'))
    .description(i18n.__('Withdraw-To-Owner'))
    .action(async (nodeId, options) => {
        checkNodeId(nodeId)
        let amount = options.amount
        checkNumber(amount)
        let {address, admin} = getPoolAddressByOptions(options, true)
        let poolAddress = address
        let encryptionKey = await checkWalletIsPassword(admin)

        let walletAddress = admin
        if (options.walletAddress) {
            walletAddress = options.walletAddress
        }
        confirmationOperation(`${i18n.__('Is-this-the-operation-you-want')}\n${i18n.__('Lending-Pool-Address')}: ${poolAddress}\n发起操作钱包地址: ${walletAddress}\n${i18n.__('Node-ID')} ${nodeId} \n${i18n.__('Repay-Type')}: ${options.rateMode.toString() === 'r' ? i18n.__('Stable-Interest-Rate') : i18n.__('Variable-Interest-Rate')}\n${i18n.__('repay-Amount')}: ${amount} FIL`,
            () => {
                repayWithCash(poolAddress, nodeId, amount, parseRateMode(options.rateMode), walletAddress, encryptionKey)
            }, options.force)
    })

nodeCommand.command('autoSealLoad <nodeId>')
    .addOption(new Option("-p,--pool <address>", "借贷池地址"))
    .requiredOption("-alt,--available-lt <amount>", "当可用余额小于当前值时，执行借款")
    .addOption(new Option("-a,--amount <amount>", "数量"))
    .addOption(new Option('-r,--rateMode <type>', i18n.__('Loan-Type-Stable-Floating')).default("v").choices(["r", "v"]))
    .option("-f, --force", i18n.__('Enforcement-inquiries'))
    .option("--init", "未执行init则执行初始化操作")
    .description('定时自动借款封装，每分钟执行一次，当可用余额小于<available-lt>时，执行借款<amount>')
    .action(async (nodeId, options) => {

        if (options.init) {
            if (!isInit()) {
                await _init(options, true)
            }
        } else {
            initCheck()
        }

        checkNodeId(nodeId)
        let amount = options.amount
        checkNumber(amount)
        let {address, admin} = getPoolAddressByOptions(options, true)
        let poolAddress = address
        let encryptionKey = await checkWalletIsPassword(admin)
        confirmationOperation(`${i18n.__('Is-this-the-operation-you-want')}\n${i18n.__('Lending-Pool-Address')}: ${poolAddress}\n${i18n.__('Node-ID')} ${nodeId} \n${i18n.__('Loan-Type')}: ${options.rateMode.toString() === 'r' ? i18n.__('Stable-Interest-Rate') : i18n.__('Variable-Interest-Rate')}\n${i18n.__('Loan-Seal-Amount')}: ${amount} FIL\n触发借款条件: 可用余额小于${options.availableLt} FIL`,
            () => {
                autoSealLoad(poolAddress, nodeId, amount, parseRateMode(options.rateMode), admin, encryptionKey, options.availableLt)
            }, options.force)
    })

nodeCommand.command('autoRepay <nodeId>')
    .addOption(new Option("-p,--pool <address>", "借贷池地址"))
    .requiredOption("-agt,--available-gt <amount>", "当可用余额大于于当前值时，执行还款")
    .addOption(new Option("-a,--amount <amount>", "数量"))
    .addOption(new Option('-r,--rateMode <type>', i18n.__('Loan-Type-Stable-Floating')).default("v").choices(["r", "v"]))
    .option("--init", "未执行init则执行初始化操作")
    .option("-f, --force", i18n.__('Enforcement-inquiries'))
    .description('定时自动还款，每分钟执行一次，当可用余额大于<available-gt>时，执行还款<amount>')
    .action(async (nodeId, options) => {

        if (options.init) {
            if (!isInit()) {
                await _init(options, true)
            }
        } else {
            initCheck()
        }

        checkNodeId(nodeId)
        let amount = options.amount
        checkNumber(amount)
        let {address, admin} = getPoolAddressByOptions(options, true)
        let poolAddress = address
        let encryptionKey = await checkWalletIsPassword(admin)
        confirmationOperation(`${i18n.__('Is-this-the-operation-you-want')}\n${i18n.__('Lending-Pool-Address')}: ${poolAddress}\n${i18n.__('Node-ID')} ${nodeId} \n${i18n.__('Repay-Type')}: ${options.rateMode.toString() === 'r' ? i18n.__('Stable-Interest-Rate') : i18n.__('Variable-Interest-Rate')}\n${i18n.__('repay-Amount')}: ${amount} FIL\n触发借款条件: 可用余额大于${options.availableGt} FIL`,
            () => {
                autoRepay(poolAddress, nodeId, amount, parseRateMode(options.rateMode), admin, encryptionKey, options.availableGt)
            }, options.force)
    })

nodeCommand.command('autoAction')
    .option("--init", "未执行init则执行初始化操作")
    .action(async (options) => {

        if (options.init) {
            if (!isInit()) {
                await _init(options, true)
            }
        } else {
            initCheck()
        }

        let action = await select({
            message: `请选择您要的操作`,
            choices: [
                {
                    name: `autoSealLoad`,
                    value: 'autoSealLoad'
                },
                {
                    name: `autoRepay`,
                    value: 'autoRepay'
                }
            ]
        })

        let nodeId = await input({
            message: `请输入节点ID`,
            validate: (_nodeId) => {
                return _nodeId.startsWith('f0')
            }
        })

        let rateMode = await select({
            message: `请选择${action === 'autoSealLoad' ? '借款' : '还款'}利率模式`,
            choices: [
                {
                    name: `浮动利率`,
                    value: "v"
                },
                {
                    name: `稳定利率`,
                    value: "r"
                }
            ]
        })

        let available = await input({
            message: `请输入触发金额，当可用余额${action === 'autoSealLoad' ? '小于' : '大于'}该金额时触发`,
            validate: (_amount) => {
                return !isNaN(_amount)
            }
        })

        let amount = await input({
            message: `请输入${action === 'autoSealLoad' ? '借款' : '还款'}金额`,
            validate: (_amount) => {
                return !isNaN(_amount)
            }
        })

        let {address, admin} = getPoolAddressByOptions(options, true)
        let poolAddress = address
        let encryptionKey = await checkWalletIsPassword(admin)

        switch (action) {
            case "autoRepay":
                confirmationOperation(`${i18n.__('Is-this-the-operation-you-want')}\n${i18n.__('Lending-Pool-Address')}: ${poolAddress}\n${i18n.__('Node-ID')} ${nodeId} \n${i18n.__('Repay-Type')}: ${rateMode.toString() === 'r' ? i18n.__('Stable-Interest-Rate') : i18n.__('Variable-Interest-Rate')}\n${i18n.__('repay-Amount')}: ${amount} FIL\n触发借款条件: 可用余额大于${available} FIL`,
                    () => {
                        autoRepay(poolAddress, nodeId, amount, parseRateMode(rateMode), admin, encryptionKey, available)
                    }, options.force)
                break
            case "autoSealLoad":
                confirmationOperation(`${i18n.__('Is-this-the-operation-you-want')}\n${i18n.__('Lending-Pool-Address')}: ${poolAddress}\n${i18n.__('Node-ID')} ${nodeId} \n${i18n.__('Loan-Type')}: ${rateMode.toString() === 'r' ? i18n.__('Stable-Interest-Rate') : i18n.__('Variable-Interest-Rate')}\n${i18n.__('Loan-Seal-Amount')}: ${amount} FIL\n触发借款条件: 可用余额小于${available} FIL`,
                    () => {
                        autoSealLoad(poolAddress, nodeId, amount, parseRateMode(rateMode), admin, encryptionKey, available)
                    }, options.force)
                break
        }
    })

program.command('update')
    .description(i18n.__('Update-Version'))
    .action(async () => {
        try {
            const response = await fetch(`https://registry.npmjs.org/${packageJson.name}/latest`);
            const data = await response.json();
            if (data.version !== packageJson.version) {
                console.log(`${i18n.__('Discover-the-new-version')}: ${data.version}. ${i18n.__('Updating')}...`);
                exec(`npm install ${packageJson.name}@${data.version} -g`, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`${i18n.__('update-failure')}: ${error}`);
                        return;
                    }
                    console.log(`${i18n.__('Successful-update')}!`);
                });
            } else {
                console.log(i18n.__('It-is-latest-version'));
            }
        } catch (error) {
            console.error(`${i18n.__('Update-check-failed')}: ${error}`);
        }
    })

program.parse();

