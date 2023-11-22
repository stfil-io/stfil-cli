const fs = require('fs')
const fsExtra = require('fs-extra')
const os = require('os')
const path = require('path')
const i18n = require('./i18n/i18n-config')
const defaultConfig = require('../defaultConfig.json')
const {ConfigNotFind} = require("./utils/Errors");
const {SK} = require("./utils/common");
const {decrypt} = require("./utils/common");

const CONFIG_ROOT_PATH = path.join(os.homedir(), '.stfil')
const configFilePath = path.join(CONFIG_ROOT_PATH, 'config.json')
let INNER_CONFIG = null


process.on('uncaughtException', (error) => {
    if (error instanceof ConfigNotFind) {

        console.log(`${i18n.__("Config-not-found-init-required")}\nstfil init`)
        process.exit(1);
    }
    if (error.message !== 'User force closed the prompt with 0 null') {
        throw error
    }
    process.exit(1);
});

function initConfig(newConfig, isDefault) {
    if (!fs.existsSync(CONFIG_ROOT_PATH)) {
        fs.mkdirSync(CONFIG_ROOT_PATH, {recursive: true})
    }
    if (!fs.existsSync(configFilePath) || isDefault) {
        if (newConfig['Main']) {
            newConfig['Main'] = {...defaultConfig['Main'], ...newConfig['Main']}
        }
        if (newConfig['Calibration']) {
            newConfig['Calibration'] = {...defaultConfig['Calibration'], ...newConfig['Calibration']}
        }
        newConfig = {...defaultConfig, ...newConfig}
    } else {
        let _config = fsExtra.readJsonSync(configFilePath)
        if (newConfig['Main']) {
            newConfig['Main'] = {..._config['Main'], ...newConfig['Main']}
        }
        if (newConfig['Calibration']) {
            newConfig['Calibration'] = {..._config['Calibration'], ...newConfig['Calibration']}
        }
        newConfig = {..._config, ...newConfig}
    }
    fsExtra.writeJsonSync(configFilePath, newConfig, {spaces: 2})
    return configFilePath
}


function isInit() {
    return fs.existsSync(configFilePath)
}

function getPrivateKey(walletAddress, encryptionKey) {
    let wallet = getConfigWallet(walletAddress)
    try {
        if (!encryptionKey) {
            return decrypt(wallet['privateKey'], SK)
        }
        return decrypt(wallet['privateKey'], encryptionKey)
    } catch (e) {
        console.error(`Error: ${i18n.__('private-key-password-error')}`)
        process.exit(1);
    }
}

function getConfig() {
    if (!INNER_CONFIG) {
        init()
    }
    if (!INNER_CONFIG) {
        throw new ConfigNotFind()
    }
    return INNER_CONFIG
}

function isPassword(address) {
    let wallet = getConfigWallet(address)
    return wallet['isPassword']
}

function _env(env) {
    let _evn = getEnv()
    if (env) {
        _evn = env
    }
    return _evn
}

function getRpc(env) {
    let config = getConfig()
    return config[_env(env)]['gateway']
}

function getConfigWallet(address) {
    let config = getConfig()
    let walletList = config['wallet']
    if (!address) {
        return walletList
    }
    let findIndex = walletList.findIndex(item => item['address'].toString().toLowerCase() === address.toString().toLowerCase());
    if (findIndex < 0) {
        console.error(`Error: ${i18n.__('wallet-not-added')}\nstfil-cli wallet add`)
        process.exit(1)
    }

    return walletList[findIndex]
}

function getConfigPool() {
    let config = getConfig()
    return config[_env()]['pool']
}

function getConfigSplp() {
    let pool = getConfigPool()
    return pool['splp']
}

function getLang() {
    let config = getConfig()
    return config['language']
}

function getSTFILTokenContractAddress(env) {
    let config = getConfig()
    return config[(_env(env))]['contract']['STFILToken']
}

function getContractAddress(env, name) {
    let config = getConfig()
    return config[(_env(env))]['contract'][name]
}

function getEnv() {
    let config = getConfig()
    return config['env']
}

function getSplp(index) {
    let splp = getConfigSplp()
    if (index !== undefined) {
        index = parseInt(index)
        if (index >= splp.length) {
            console.log(`Error: ${i18n.__('max-lending-pool-serial-number')}${splp.length - 1}`)
            process.exit(1)
        }
        return splp[index]
    }
    index = splp.findIndex(item => item['default'])
    if (index < 0) {
        if (splp.length === 0) {
            console.error(`Error: ${i18n.__('p-add-lending-pool')}\n stfil-cli splp add`)
            process.exit(1)
        }
        return splp[0]
    }
    return splp[index]
}

function init() {

    if (isInit()) {
        let _config = fsExtra.readJsonSync(configFilePath)
        INNER_CONFIG = _config
        i18n.setLocale(_config.language);
    }

}

module.exports = {
    init,
    initConfig,
    getConfig,
    isInit,
    getPrivateKey,
    configFilePath,
    getRpc,
    getSTFILTokenContractAddress,
    getContractAddress,
    getLang,
    isPassword,
    getConfigWallet,
    getConfigPool,
    getConfigSplp,
    getSplp,
    getEnv
}
