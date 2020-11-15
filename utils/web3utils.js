const erc20ABI = require('./../abis/erc20');
const BigNumber = require('bignumber.js');

class Web3Utils {
    /**
     * fetches informations about a token 
     *
     * @param {String} tokenAdress token contract
     * @return {Object} object with informations from the token 
     */
    static async fetchTokenInfos(tokenAdress, web3) {
        // fetches the contract of the token0
        const tokenContract = new web3.eth.Contract(erc20ABI, tokenAdress);
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
     * ___internal functions to save duplicate code
     *
     * @param {String} tokenAddress contract address of erc20 token, can be null when pairAdress is known
     * @param {Number} decimals decimals of the token
     * @param {Boolean} reverse can be used to save web3 calls, if token0/token1 is known
     * @param {String} pairAddress can be used to save web3 calls, if pairAdress is known
     * @return {Number} price of the token in ETH 
     * @memberof Web3Utils
     */
    static async getPrice(tokenAddress, decimals, reverse, pairContract, block) {
        // WETH/ETH 1:1
        if (tokenAddress == Web3Utils.WETH) return 1;

        let index0 = 0,
            index1 = 1;

        if (reverse == true) {
            index0 = 1;
            index1 = 0;
        }
        // get reserves of uniswap pair
        const reserves = await pairContract.methods.getReserves().call(block || "latest");
        // fetch balances
        let tokenBalance = new BigNumber(reserves[index0]);
        let wethBalance = new BigNumber(reserves[index1]);
        // convert to normal numbers with decimals
        const wethSupply = wethBalance.div(Web3Utils.WETH_BIG);
        const tokenSupply = tokenBalance.div((new BigNumber(10).pow(new BigNumber(decimals))));
        // calculate and return price of token in ETH
        return wethSupply.div(tokenSupply).toNumber();
    }

    /**
     * checks if token0 or token1 is the real token and the other one the WETH thing
     *
     * @param {Contract} pairContract contract of WETH/token pair
     * @return {Boolean} reverse or not: token1==WETH => reverse=true 
     * @memberof Web3Utils
     */
    static async getReverse(pairContract) {
        if ((await pairContract.methods.token0().call()).toLowerCase() == Web3Utils.WETH) {
            return true;
        } else if ((await pairContract.methods.token1().call()).toLowerCase() == Web3Utils.WETH) {
            return false;
        }
        throw new Error("No WETH pair available");
    }
}

module.exports = Web3Utils;
Web3Utils.WETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2".toLowerCase();
Web3Utils.WETH_BIG = new BigNumber(10).pow(new BigNumber(18));