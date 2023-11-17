#!/usr/bin/env node
const {encrypt, SK} = require("./src/utils/common");

const {Command, Option} = require('commander');
const figlet = require('figlet');
const {select, password} = require('@inquirer/prompts');
const program = new Command();
const i18n = require('./src/i18n/i18n-config');
const {withdrawLoan} = require("./src/service");
const {poolNodeInfo} = require("./src/service");
const {poolInfo} = require("./src/service");
const {isAddress} = require("ethers");
const {poolNodes} = require("./src/service");
const {withdraw} = require("./src/service");
const {repay} = require("./src/service");
const {sealLoan} = require("./src/service");
const {nodeInfo} = require("./src/service");
const {walletInfo} = require("./src/service");
const {configFilePath} = require("./src/init");
const {getConfig} = require("./src/init");
const {isInit} = require("./src/init");
const {initConfig, init} = require("./src/init");
const packageJson = require('./package.json');
const {isPassword} = require("./src/init");
const {exec} = require('child_process');

init()

let logo = figlet.textSync('STFIL CMD HUB', {
    font: 'big',
})

program
    .name('stfil-cli')
    .description(logo + '\nSTFIL Contract Execution Tool')
    .version('1.1.1')

const passwordRegex = /^[A-Za-z0-9!@#$%^&*(),.?":{}|<>]{8,20}$/;

async function checkIsPassword() {
    let isP = isPassword()
    let encryptionKey
    if (isP) {
        encryptionKey = await password({
            message: i18n.__('Enter-encryption-password'),
        })
    }
    return encryptionKey
}

program.command('init')
    .description(i18n.__('Initializer-Configuration'))
    .option('-f, --force', i18n.__('Init-Config-With-Default'))
    .action(async (options) => {
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

        let privateKey = await password({
            message: i18n.__("input-privateKey"),
            mask: '*',
        })

        let config = {
            language,
            env,
            isPassword,
            privateKey: privateKey ? encrypt(privateKey, isPassword ? encryptionKey : SK) : null
        }

        initConfig(config, !!options.force)

    })

const configCommand = program
    .command('config')
    .description(i18n.__('Project-Config'))

configCommand
    .command("view")
    .description(i18n.__('View-Current-Config'))
    .action(() => {
        if (isInit()) {
            let config = getConfig()
            console.log(config);
        } else {
            console.log(`${i18n.__('Config-File-NotFound-Initialize-First')}\nstfil init`)
        }
    });

configCommand
    .command("path")
    .description(i18n.__('View-Current-Config-Path'))
    .action(() => {
        if (isInit()) {
            console.log(configFilePath)
        } else {
            console.log(`${i18n.__('Config-File-NotFound-Initialize-First')}\nstfil init`)
        }
    });

const walletCommand = program
    .command('wallet')
    .description(i18n.__('Wallet-Ops'))

walletCommand
    .command("info")
    .description(i18n.__('Get-Wallet-Info'))
    .action(async (options) => {
        let encryptionKey = await checkIsPassword()
        walletInfo(encryptionKey)
    })

const spCommand = program
    .command('sp')
    .description(i18n.__('Storage-Provider-Ops'))

const poolCommand = spCommand.command('pool')
    .description(i18n.__('Lending-Pool'))

function checkNodeId(nodeId) {
    if (!nodeId.startsWith('f0')) {
        console.error(`Error: ${i18n.__('NodeId-StartsWith-f0')}`);
        process.exit(1);
    }
}

function checkNumber(amount) {
    if (isNaN(amount)) {
        console.error('error: amount is invalid. Must be a number.');
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

spCommand.command('info')
    .argument("<nodeId>", i18n.__('Node-ID'))
    .description(i18n.__('Node-Info'))
    .action(async (nodeId) => {
        checkNodeId(nodeId)
        nodeInfo(nodeId)
    })

poolCommand.command('info <poolAddress>')
    .description(i18n.__('Lending-Pool-Info'))
    .action(async (poolAddress) => {
        checkAddress(poolAddress)
        poolInfo(poolAddress)
    })

poolCommand.command('nodeInfo <poolAddress> <nodeId>')
    .description(i18n.__('Lending-Pool-Node-Info'))
    .action(async (poolAddress, nodeId) => {
        checkAddress(poolAddress)
        checkNodeId(nodeId)
        poolNodeInfo(poolAddress, nodeId)
    })


poolCommand.command('nodes <poolAddress>')
    .description(i18n.__('Lending-Pool-Node-List'))
    .action(async (poolAddress) => {
        checkAddress(poolAddress)
        poolNodes(poolAddress)
    })

poolCommand.command('sealLoan <poolAddress> <nodeId> <amount>')
    .addOption(new Option('-r,--rateMode <type>', i18n.__('Loan-Type-Stable-Floating')).default("2").choices(["1", "2"]))
    .option("-f, --force", i18n.__('Enforcement-inquiries'))
    .description(i18n.__('Loan-Seal'))
    .action(async (poolAddress, nodeId, amount, options) => {
        checkAddress(poolAddress)
        checkNodeId(nodeId)
        checkNumber(amount)
        let encryptionKey = await checkIsPassword()
        confirmationOperation(`${i18n.__('Is-this-the-operation-you-want')}\n${i18n.__('Lending-Pool-Address')}: ${poolAddress}\n${i18n.__('Node-ID')} ${nodeId} \n${i18n.__('Loan-Type')}: ${options.rateMode.toString() === '1' ? i18n.__('Stable-Interest-Rate') : i18n.__('Variable-Interest-Rate')}\n${i18n.__('Loan-Seal-Amount')}: ${amount} FIL`,
            () => {
                sealLoan(poolAddress, nodeId, amount, options.rateMode, encryptionKey)
            }, options.force)
    })

poolCommand.command('withdrawLoan <poolAddress> <nodeId> <amount>')
    .addOption(new Option('-r,--rateMode <type>', i18n.__('Loan-Type-Stable-Floating')).default("2").choices(["1", "2"]))
    .option("-f, --force", i18n.__('Enforcement-inquiries'))
    .description(i18n.__('Loan-Withdrawal'))
    .action(async (poolAddress, nodeId, amount, options) => {
        checkAddress(poolAddress)
        checkNodeId(nodeId)
        checkNumber(amount)
        let encryptionKey = await checkIsPassword()
        confirmationOperation(`${i18n.__('Is-this-the-operation-you-want')}\n${i18n.__('Lending-Pool-Address')}: ${poolAddress}\n${i18n.__('Node-ID')} ${nodeId} \n${i18n.__('Loan-Withdrawal-Type')}: ${options.rateMode.toString() === '1' ? i18n.__('Stable-Interest-Rate') : i18n.__('Variable-Interest-Rate')}\n${i18n.__('Loan-Withdrawal-Amount')}: ${amount} FIL`,
            () => {
                withdrawLoan(poolAddress, nodeId, amount, options.rateMode, encryptionKey)
            }, options.force)
    })

poolCommand.command('repay <poolAddress> <nodeId> <amount>')
    .addOption(new Option('-r,--rateMode <type>', i18n.__('Loan-Type-Stable-Floating')).default("2").choices(["1", "2"]))
    .option("-f, --force", i18n.__('Enforcement-inquiries'))
    .description(i18n.__('Repayment'))
    .action(async (poolAddress, nodeId, amount, options) => {
        checkAddress(poolAddress)
        checkNodeId(nodeId)
        checkNumber(amount)
        let encryptionKey = await checkIsPassword()
        confirmationOperation(`${i18n.__('Is-this-the-operation-you-want')}\n${i18n.__('Lending-Pool-Address')}: ${poolAddress}\n${i18n.__('Node-ID')} ${nodeId} \n${i18n.__('Repay-Type')}: ${options.rateMode.toString() === '1' ? i18n.__('Stable-Interest-Rate') : i18n.__('Variable-Interest-Rate')}\n${i18n.__('repay-Amount')}: ${amount} FIL`,
            () => {
                repay(poolAddress, nodeId, amount, options.rateMode, encryptionKey)
            }, options.force)
    })

poolCommand.command('withdraw <poolAddress> <nodeId> <amount>')
    .option("-f, --force", i18n.__('Enforcement-inquiries'))
    .description(i18n.__('Withdraw-To-Owner'))
    .action(async (poolAddress, nodeId, amount, options) => {
        checkAddress(poolAddress)
        checkNodeId(nodeId)
        checkNumber(amount)
        let encryptionKey = await checkIsPassword()

        confirmationOperation(`${i18n.__('Is-this-the-operation-you-want')}\n${i18n.__('Lending-Pool-Address')}: ${poolAddress}\n${i18n.__('Node-ID')} ${nodeId} \n${i18n.__('withdraw-Amount')}: ${amount} FIL`,
            () => {
                withdraw(poolAddress, nodeId, amount, encryptionKey)
            }, options.force)
    })


spCommand.command('sealLoan <nodeId> <amount>')
    .addOption(new Option('-r,--rateMode <type>', i18n.__('Loan-Type-Stable-Floating')).default("2").choices(["1", "2"]))
    .option("-f, --force", i18n.__('Enforcement-inquiries'))
    .description(i18n.__('Loan'))
    .action(async (nodeId, amount, options) => {
        checkNodeId(nodeId)
        checkNumber(amount)
        let encryptionKey = await checkIsPassword()
        confirmationOperation(`${i18n.__('Is-this-the-operation-you-want')}\n${i18n.__('Node-ID')} ${nodeId} \n${i18n.__('Loan-Type')}: ${options.rateMode.toString() === '1' ? i18n.__('Stable-Interest-Rate') : i18n.__('Variable-Interest-Rate')}\n${i18n.__('Loan-Seal-Amount')}: ${amount} FIL`,
            () => {
                sealLoan(null, nodeId, amount, options.rateMode, encryptionKey)
            }, options.force)
    })

spCommand.command('repay <nodeId> <amount>')
    .addOption(new Option('-r,--rateMode <type>', i18n.__('Loan-Type-Stable-Floating')).default("2").choices(["1", "2"]))
    .option("-f, --force", i18n.__('Enforcement-inquiries'))
    .description(i18n.__('Repayment'))
    .action(async (nodeId, amount, options) => {
        checkNodeId(nodeId)
        checkNumber(amount)
        let encryptionKey = await checkIsPassword()
        confirmationOperation(`${i18n.__('Is-this-the-operation-you-want')}\n${i18n.__('Node-ID')} ${nodeId} \n${i18n.__('Repay-Type')}: ${options.rateMode.toString() === '1' ? i18n.__('Stable-Interest-Rate') : i18n.__('Variable-Interest-Rate')}\n${i18n.__('repay-Amount')}: ${amount} FIL`,
            () => {
                repay(null, nodeId, amount, options.rateMode, encryptionKey)
            }, options.force)
    })

spCommand.command('withdraw <nodeId> <amount>')
    .option("-f, --force", i18n.__('Enforcement-inquiries'))
    .description(i18n.__('Withdraw-To-Owner'))
    .action(async (nodeId, amount, options) => {
        checkNodeId(nodeId)
        checkNumber(amount)
        let encryptionKey = await checkIsPassword()

        confirmationOperation(`${i18n.__('Is-this-the-operation-you-want')}\n${i18n.__('Node-ID')} ${nodeId} \n${i18n.__('withdraw-Amount')}: ${amount} FIL`,
            () => {
                withdraw(null, nodeId, amount, encryptionKey)
            }, options.force)
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

