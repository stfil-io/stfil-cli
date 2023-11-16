/* eslint-disable no-undef */
const MAX_UINT256 = 115792089237316195423570985008687907853269984665640564039457584007913129639935n

const WAD = 1000000000000000000n
const WAD_2 = 100000000000000n
const halfWAD = WAD / BigInt(2)

const RAY = 1000000000000000000000000000n
const halfRAY = RAY / BigInt(2)

const WAD_RAY_RATIO = 1000000000n

const E23 = 100000000000000000000000n
const E25 = 10000000000000000000000000n

const TOW_RAY = BigInt(2) * RAY
const THREE_RAY = BigInt(3) * RAY


let WadRayMath = {
    WAD,
    WAD_2,
    RAY,
    TOW_RAY,
    THREE_RAY,
    wadMul: (a, b) => {
        if (a === BigInt(0) || b === BigInt(0)) {
            return 0n;
        }

        if (a > (MAX_UINT256 - halfWAD) / b) {
            return BigInt(0)
        }

        return (a * b) / WAD;
    },

    wadDiv: (a, b) => {
        if (b === BigInt(0)) {
            return BigInt(0)
        }
        const halfB = b / BigInt(2);

        if (a > (MAX_UINT256 - halfB) / WAD) {
            return BigInt(0)
        }

        return (a * WAD) / b;
    },

    rayMul: (a, b) => {
        if (a === BigInt(0) || b === BigInt(0)) {
            return 0n;
        }

        if (a > (MAX_UINT256 - halfRAY) / b) {
            return BigInt(0)
        }

        return (a * b) / RAY;
    },

    rayMulRound: (a, b) => {
        if (a === BigInt(0) || b === BigInt(0)) {
            return 0n;
        }

        if (a > (MAX_UINT256 - halfRAY) / b) {
            return BigInt(0)
        }

        return (a * b + halfRAY) / RAY;
    },

    rayDiv: (a, b) => {
        if (b === BigInt(0)) {
            return BigInt(0)
        }
        const halfB = b / BigInt(2);

        if (a > (MAX_UINT256 - halfB) / RAY) {
            return BigInt(0)
        }

        return (a * RAY) / b;
    },

    rayToWad: (a) => {
        const halfRatio = WAD_RAY_RATIO / BigInt(2);
        const result = halfRatio + a;
        if (result < halfRatio) {
            return BigInt(0)
        }

        return result / WAD_RAY_RATIO;
    },


    wadToRay: (a) => {
        const result = a * WAD_RAY_RATIO;
        if (result / WAD_RAY_RATIO !== a) {
            return BigInt(0)
        }

        return result;
    },

    rayPow: (a, p) => {
        if (p === 0n) {
            return RAY
        }
        let v = a
        for (let i = 2; i <= p; i++) {
            v = WadRayMath.rayMul(v, a)
        }
        return v
    },

    rayMultiPow: (a, p) => {
        let multi = []
        multi.push(RAY)
        if (p === 0n) {
            return multi
        }
        let v = a
        multi.push(v)
        for (let i = 2; i <= p; i++) {
            v = WadRayMath.rayMul(v, a)
            multi.push(v)
        }
        return multi
    }
}

module.exports = {WadRayMath, RAY, E23, E25, MAX_UINT256}
