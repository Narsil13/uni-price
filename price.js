const factoryABI = require("./../abis/factory");
const unipairABI = require("./../abis/unipair");
const erc20ABI = require('./../abis/erc20');
const BigNumber = require('bignumber.js');
const USDPairs = require("./usdpairs");

// UNISWAP factory address
const FACTORY_ADRESS = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
// WETH token address
const WETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2".toLowerCase();
// WETH has 18 decimals
const WETH_BIG = new BigNumber(10).pow(new BigNumber(18));

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

    /**
     * fetching pair from uniswap factory address
     *
     * @param {String} tokenAddress token to search for
     * @return {String} pair WETH/Token pair adress 
     */
    async getPairAddress(tokenAddress) {
        try {
            return await this.factory.methods.getPair(WETH, tokenAddress).call();
        } catch (e) {
            console.log("trying other direction pair", tokenAddress);
        }
        return await this.factory.methods.getPair(tokenAddress, WETH).call();
    }

    /**
     * fetches informations about a token 
     *
     * @param {String} tokenAdress token contract
     * @return {Object} object with informations from the token 
     */
    async __fetchTokenInfos(tokenAdress) {
        // fetches the contract of the token0
        const tokenContract = new this.web3.eth.Contract(erc20ABI, tokenAdress);
        const name = await tokenContract.methods.name().call();
        const decimals = await tokenContract.methods.decimals().call();
        const ticker = await tokenContract.methods.symbol().call();
        return {
            address: tokenAdress,
            // fetch token name
            name,
            // fetch token decimals
            decimals,
            // symbol
            ticker
        };
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
            const token = await __fetchTokenInfos(tokenAddress);
            decimals = token.decimals;
        }

        return this.__getPrice(tokenAddress, decimals);
    }


    /**
     * ___internal functions to save duplicate code
     *
     * @param {String} tokenAddress contract address of erc20 token, can be null when pairAdress is known
     * @param {Number} decimals decimals of the token
     * @param {Boolean} reverse can be used to save web3 calls, if token0/token1 is known
     * @param {String} pairAddress can be used to save web3 calls, if pairAdress is known
     * @return {Number} price of the token in ETH 
     * @memberof Price
     */
    async __getPrice(tokenAddress, decimals, reverse, pairAddress) {
        // WETH/ETH 1:1
        if (tokenAddress == WETH) return 1;
        // search for pair of ETH/token pair
        if (pairAddress == undefined) pairAddress = await getPairAddress(tokenAddress, factory);
        // if found instantiate uniswap pair contract
        const pairContract = new this.web3.eth.Contract(unipairABI, pairAddress);

        let index0 = 0,
            index1 = 1;

        if (reverse != undefined) {
            if (reverse == true) {
                index0 = 1;
                index1 = 0;
            }
        }
        // check if token0 is WETH, when not, then it must be token1
        else if ((await pairContract.methods.token0().call().toLowerCase()) == WETH) {
            index0 = 1;
            index1 = 0;
        }

        // get reserves of uniswap pair
        const reserves = await pairContract.methods.getReserves().call(this.block);
        // fetch balances
        let tokenBalance = new BigNumber(reserves[index0]);
        let wethBalance = new BigNumber(reserves[index1]);
        // convert to normal numbers with decimals
        const wethSupply = wethBalance.div(WETH_BIG);
        const tokenSupply = tokenBalance.div((new BigNumber(10).pow(new BigNumber(decimals))));
        // calculate and return price of token in ETH
        return wethSupply.div(tokenSupply).toNumber();
    }

    async getAllInfos(tokenAddress) {
        const token = await __fetchTokenInfos(tokenAddress);
        token.price = await this.__getPrice(tokenAddress, token.decimals);
        return token;
    }

    async getETHUSD() {
        let sum = 0;
        for (const USDPair of USDPairs) {
            sum += await this.__getPrice(null, USDPair.decimals, USDPair.reverse, USDPair.pairAddress);
        }
        return sum / USDPairs.length;
    }

    async watchPrice(callback) {

    }
}

module.exports = function (web3) {
    return new Price(web3);
}