/* eslint-disable no-undef */
const MAX = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF")
const PERCENTAGE_FACTOR = BigInt(10000)
const HALF_PERCENT = PERCENTAGE_FACTOR / BigInt(2);

let PercentageMath = {

    mul: (value, percentage) => {

        if (value === BigInt(0) || percentage === BigInt(0)) {
            return BigInt(0)
        }

        if (value > (MAX - HALF_PERCENT) / percentage) {
            return BigInt(0)
        }

        return (value * percentage) / PERCENTAGE_FACTOR;

    },

    div: (value, percentage) => {

        if (percentage === BigInt(0)) {
            return BigInt(0)
        }
        const halfPercentage = percentage / BigInt(2);

        if (value > (MAX - halfPercentage) / PERCENTAGE_FACTOR) {
            return BigInt(0)
        }

        return (value * PERCENTAGE_FACTOR) / percentage;

    },


}

module.exports = PercentageMath
