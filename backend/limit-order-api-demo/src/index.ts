import { createWeb3 } from "./create-order";
import { cancelWeb3 } from "./cancel-order";
import { getOrderList } from "./get-orders";
import Web3 from "web3";
import { RPCS, PrivateKey } from "./const";

const chainId = '8453'
const providerUrl = RPCS[chainId];
const web3 = new Web3(providerUrl);
const account = web3.eth.accounts.privateKeyToAccount(PrivateKey);

const inToken = {
  "address": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  "decimals": 6,
  "symbol": "USDC",
  "amount": 10000000,
}
// Token configuration for WETH
const outToken = {
  "address": "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2",
  "decimals": 6,
  "symbol": "USDT",
  "amount": 10000000,
}

// Test cases
async function runTests() {
  try {
    console.log('Starting tests...');

    // Test Web3.js create order
    console.log('\nTesting Web3.js create order:');
    await createWeb3(chainId, inToken, outToken);

    // Test Ethers.js create order
    // console.log('\nTesting Ethers.js create order:');
    // await createEthers(chainId, inToken, outToken);

    const orders = await getOrderList(chainId, account.address);
    console.log(orders);

    // Test Web3.js cancel order
    console.log('\nTesting Web3.js cancel order:');
    await cancelWeb3(chainId, orders[0]);

    // Test Ethers.js cancel order
    // console.log('\nTesting Ethers.js cancel order:');
    // await cancelEthers(chainId, orders[0]);

    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Run tests
runTests();
