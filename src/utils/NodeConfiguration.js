/*eslint-disable*/
module.exports = class NodeConfiguration {
    static #ACTIVE_MASK                = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFE"
    static #BORROW_MASK                = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFD"
    static #LEVERAGE_THRESHOLD_MASK    = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0000F"
    static #LIQUIDATION_THRESHOLD_MASK = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0000FFFFF"

    static #IS_ACTIVE_START_BIT_POSITION = 0
    static #IS_BORROW_START_BIT_POSITION = 1
    static #LEVERAGE_START_BIT_POSITION = 4
    static #LIQUIDATION_THRESHOLD_START_BIT_POSITION = 20

    data

    constructor(_data) {
        this.data = BigInt(_data)
    }

    isActive() {
        const activeMASK = BigInt(NodeConfiguration.#ACTIVE_MASK)
        return (this.data & ~activeMASK) !== BigInt(0)
    }

    getBorrowing() {
        const borrowMASK = BigInt(NodeConfiguration.#BORROW_MASK)
        return (this.data & ~borrowMASK) !== BigInt(0)
    }

    getMaxLeverage() {
        const leverageThresholdMASK = BigInt(NodeConfiguration.#LEVERAGE_THRESHOLD_MASK)
        return (this.data & ~leverageThresholdMASK) >> BigInt(NodeConfiguration.#LEVERAGE_START_BIT_POSITION)
    }

    getLiquidationThreshold() {
        const liquidationThresholdMASK = BigInt(NodeConfiguration.#LIQUIDATION_THRESHOLD_MASK)
        return (this.data & ~liquidationThresholdMASK) >> BigInt(NodeConfiguration.#LIQUIDATION_THRESHOLD_START_BIT_POSITION)
    }
}
