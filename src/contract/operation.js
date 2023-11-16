const {Contract} = require("ethers");
const {JsonRpcProvider, Wallet} = require("ethers");
const {HttpJsonRpcConnector, LotusClient, LotusWalletProvider} = require("filecoin.js");

let getWallet = (privateKey, rpc) => {
    let provider = getProvider(rpc)
    return new Wallet(privateKey, provider);
}

let getProvider = (rpc) => {
    return new JsonRpcProvider(rpc, undefined, {
        batchMaxCount: 1
    });
}

let getContract = (wallet, contractAddress, abi) => {
    return new Contract(contractAddress, abi, wallet)
}


let getFilecoinProvider = (gateway) => {
    const httpConnector = new HttpJsonRpcConnector({
        url: gateway
    });
    const lotusClient = new LotusClient(httpConnector);
    return new LotusWalletProvider(lotusClient);
}

module.exports = {getWallet, getContract, getFilecoinProvider}
