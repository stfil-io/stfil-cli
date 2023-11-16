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
        newConfig = {...defaultConfig, ...newConfig}
    } else {
        let _config = fsExtra.readJsonSync(configFilePath)
        newConfig = {..._config, ...newConfig}
    }
    fsExtra.writeJsonSync(configFilePath, newConfig, {spaces: 2})
    console.log(`${i18n.__("config-created")} "${configFilePath}"`)
}


function isInit() {
    return fs.existsSync(configFilePath)
}

function getPrivateKey() {
    let config = getConfig()
    if (!config['privateKey']) {
        throw new ConfigNotFind()
    }
    return decrypt(config['privateKey'], SK)
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

function _env(env) {
    let _evn = getEnv()
    if (env) {
        _evn = env
    }
    return _evn
}

function getRpc(env) {
    let config = getConfig()
    return config['gateway'][_env(env)]
}

function getLang() {
    let config = getConfig()
    return config['language']
}

function getSTFILTokenContractAddress(env) {
    let config = getConfig()
    return config['contract'][(_env(env))]['STFILToken']
}

function getContractAddress(env, name) {
    let config = getConfig()
    return config['contract'][(_env(env))][name]
}

function getEnv() {
    let config = getConfig()
    return config['env']
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
    getEnv,
    getRpc,
    getSTFILTokenContractAddress,
    getContractAddress,
    getLang
}
