const crypto = require('crypto');
const {solidityPacked} = require("ethers");

const SK = "bb5d11450c465da624df5c415e802092b9eddfe73b6708905f6e22ad1971639c"

function encrypt(text, secretKey) {
    const iv = crypto.randomBytes(16); // 生成随机初始化向量
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text, secretKey) {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey, 'hex'), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

let getActorAddress = (actorId) => {
    if (actorId.toString().startsWith("f0")) {
        actorId = actorId.toString().substr(2)
    }
    return solidityPacked(
        ["uint32", "uint64", "uint64"],
        [4278190080, 0, actorId]
    )
}

const RE = new RegExp("Error\\((\\d+)\\)");
const RE2 = new RegExp("RetCode=(\\d+)?");


let contractParseCode = (err) => {
    if (typeof err === "object") {
        err = JSON.stringify(err)
    }
    let regExpExecArray = RE.exec(err);
    if (regExpExecArray && regExpExecArray.length > 1) {
        return regExpExecArray[1]
    }

    let regExpExecArray2 = RE2.exec(err);
    if (regExpExecArray2 && regExpExecArray2.length > 1) {
        return regExpExecArray2[1]
    }
    return -1
}
module.exports = {encrypt, decrypt, SK, getActorAddress, contractParseCode};
