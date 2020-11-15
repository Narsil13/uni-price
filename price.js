const factoryABI = require("./abis/factory");
const unipairABI = require("./abis/unipair");
const USDPairs = require("./usdpairs");
const Web3Utils = require("./utils/web3utils");

// UNISWAP factory address
const FACTORY_ADRESS = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

class Price {
    constructor(web3) {
        this.web3 = web3;
        this.factory = new this.web3.eth.Contract(factoryABI, FACTORY_ADRESS);
        this.block = "latest";
    }

    setBlock(block) {
        if (block == undefined) this.block = "latest";
        this.block = block;
    }

    clearBlock() {
        this.setBlock();
    }

    /**
     * fetching pair from uniswap factory address
     *
     * @param {String} tokenAddress token to search for
     * @return {String} pair WETH/Token pair adress 
     */
    async getPairAddress(tokenAddress) {
        try {
            return await this.factory.methods.getPair(Web3Utils.WETH, tokenAddress).call();
        } catch (e) {
            console.log("trying other direction pair", tokenAddress);
        }
        return await this.factory.methods.getPair(tokenAddress, Web3Utils.WETH).call();
    }

    /**
     * calculates the price of a token in ETH
     *
     * @param {String} tokenAddress contract address of erc20 token
     * @param {Number} [decimals] decimals of the token, can be set if already known, to save web3 calls. When not set it automatically fetches the token decimals
     * @return {Number} price of the token in ETH 
     * @memberof Price
     */
    async get(tokenAddress, decimals) {
        if (decimals == undefined) {
            const token = await Web3Utils.fetchTokenInfos(tokenAddress, this.web3);
            decimals = token.decimals;
        }

        const pairAddress = await this.getPairAddress(tokenAddress);
        const pairContract = new this.web3.eth.Contract(unipairABI, pairAddress);
        const reverse = await Web3Utils.getReverse(pairContract);
        return Web3Utils.getPrice(tokenAddress, decimals, reverse, pairContract, this.block));
}

async getAllInfos(tokenAddress) {
    const token = await Web3Utils.fetchTokenInfos(tokenAddress, this.web3);
    const pairAddress = await this.getPairAddress(tokenAddress);
    const pairContract = new this.web3.eth.Contract(unipairABI, pairAddress);
    const reverse = await Web3Utils.getReverse(pairContract);
    token.price = await Web3Utils.getPrice(tokenAddress, token.decimals, reverse, pairContract, this.block);
    return token;
}

async getETHUSD() {
    let sum = 0;
    for (const USDPair of USDPairs) {
        const pairContract = new this.web3.eth.Contract(unipairABI, USDPair.pairAddress);

        sum += 1 / (await Web3Utils.getPrice(null, USDPair.decimals, USDPair.reverse, pairContract, this.block));
    }
    return sum / USDPairs.length;
}
}

module.exports = function (web3) {
    return new Price(web3);
}