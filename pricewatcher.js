const Timer = require("./utils/timer");
const SwapSig = require("./abis/swapsig");
const unipairABI = require("./abis/unipair");
const abiDecoder = require("abi-decoder");
const BigNumber = require('bignumber.js');
const Web3Utils = require("./utils/web3utils");
abiDecoder.addABI(unipairABI);

// WETH token address
const WETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2".toLowerCase();
// WETH has 18 decimals
const WETH_BIG = new BigNumber(10).pow(new BigNumber(18));

class PriceWatcher {

    /**
     * Creates an instance of PriceWatcher.
     * @param {Price} price a price object
     * @memberof PriceWatcher
     */
    constructor(web3) {
        this.web3 = web3;
        this.started = false;
        this.callbacks = [];
        this.logs = [];
        this.topics = [];
        this.cache = {};
    }

    async register(callback) {
        if (!this.started) {
            this.topics = [this.web3.eth.abi.encodeEventSignature(SwapSig)]
            this.web3.eth.subscribe("logs", {
                topics: this.topics
            }, this.onPriceEvent.bind(this));
        }

        this.callbacks.push(callback);
    }

    onPriceEvent(error, result) {
        if (error || !result) {
            return console.error(error || "empty payload");
        }

        if (this.timeout) {
            this.timeout();
            this.logs.push(result);
            return;
        }

        this.timeout = Timer(this._onPriceEventEnded.bind(this), 2000);
    }

    _onPriceEventEnded() {
        try {
            const logs = abiDecoder.decodeLogs(this.logs);
            if (!logs) throw new Error("empty payload from abiDecoder");
            this._calculatePrices(logs);
        } catch (e) {
            console.error(e);
        } finally {
            this.logs = [];
            this.timeout = null;
        }
    }

    async _calculatePrices(logs) {
        const logCache = {};
        const pairAddresses = logs.map((e) => {
            if (!e) return;
            const eAddr = e.address.toLowerCase();
            if (!logCache[eAddr]) logCache[eAddr] = [e];
            else logCache[eAddr].push(e);
            return eAddr;
        });

        for (const pairAddress of pairAddresses) {
            const pairContract = new this.web3.eth.Contract(unipairABI, pairAddress);
            let cachedPair = this.cache[pairAddress];
            // when not cached, cache it
            if (cachedPair == undefined) cachedPair = this.cache[pairAddress] = await this._getInfos(pairAddress);
            if (cachedPair == false) continue;

            // get reserves price after TODO probably wrong
            const price = await Web3Utils.getPrice(cachedPair.address, cachedPair.decimals, cachedPair.reverse, pairContract);
            const volume = this._getVolume(logCache[pairAddress], cachedPair.reverse);

            for (const cb of this.callbacks) {
                cb(cachedPair, price, volume, /*block*/ );
            }
        }
    }

    _getVolume(logs, reverse) {
        let volume = 0;
        for (const log of logs) {
            const volumeIn = new BigNumber(log.events[reverse ? 1 : 2].value).div(WETH_BIG);
            const volumeOut = new BigNumber(log.events[reverse ? 3 : 4].value).div(WETH_BIG);
            // const amountToken = new BigNumber(log.events[reverse ? 1 : 3].value).div(WETH_BIG);
            // const amountETH = new BigNumber(log.events[reverse ? 4 : 2].value).div(WETH_BIG);
            volume += volumeIn.toNumber() + volumeOut.toNumber();
        }

        return volume;
    }

    async _getInfos(pairAddress) {
        const pairContract = new this.web3.eth.Contract(unipairABI, pairAddress);
        const token0 = (await pairContract.methods.token0().call()).toLowerCase();
        const token1 = (await pairContract.methods.token1().call()).toLowerCase();

        if (token0 == WETH) {
            const token = await Web3Utils.fetchTokenInfos(token1, this.web3);
            return Object.assign(token, {
                reverse: true
            });
        } else if (token1 == WETH) {
            const token = await Web3Utils.fetchTokenInfos(token0, this.web3);
            return Object.assign(token, {
                reverse: false
            });
        }

        return false;
    }
}

module.exports = PriceWatcher;