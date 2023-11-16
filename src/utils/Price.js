const {formatUnits,parseUnits} = require("ethers");
let longToShort = (longFil, toFixed) => {
    let shortPrice = formatUnits(longFil, 18)
    if (toFixed) {
        return parseFloat(shortPrice).toFixed(toFixed)
    }
    return shortPrice;
}

let shortToLong = (shortFil) => {
    return parseUnits(shortFil, 18)
}


let percent_wad = (val) => {
    return formatUnits(val, 2)
}

let wad = (val) => {
    return formatUnits(val, 4)
}

module.exports = {longToShort, percent_wad, wad, shortToLong}
