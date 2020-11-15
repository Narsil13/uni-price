## Uni-price
Get latest prices of **uniswap**

### Installation

Use npm:

```
npm i @narsil13/uni-price
```

Or Yarn:

```
yarn add @narsil13/uni-price
```

### Usage

```javascript
// should be configured first as dependency
const Web3 = require("web3");
const web3 = new Web3("urltoETHNode");
const Price = require("@narsil13/uni-price")(web3);

// just specify a tokenAddress and returns price in ETH
let tokenPrice = await Price.get("0x04b5e13000c6e9a3255dc057091f3e3eeee7b0f0");
// output for example: 0.05
console.log(tokenPrice);

let tokenInfos = await Price.getAllInfos("0x04b5e13000c6e9a3255dc057091f3e3eeee7b0f0");
/* output for example: 
   {
       address: "0x04b5e13000c6e9a3255dc057091f3e3eeee7b0f0"
       decimals: 18,
       name: "Unifund",
       ticker: "IFUND",
       // price in ETH
       price: 0.0005
   }
*/
console.log(tokenInfos);

// fetches latest price of Ether in USD
let ethUSDPrice = await Price.getETHUSD();
// output for example: 460$
console.log(ethUSDPrice);

// calculates the price of token in dollar
let tokenPriceUSD = ethUSDPrice * tokenPrice;
console.log(tokenPriceUSD)
```