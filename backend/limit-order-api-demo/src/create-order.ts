import { openoceanLimitOrderSdk, WalletParams } from "@openocean.finance/limitorder-sdk";
import axios from "axios";
import Web3 from "web3";
import { ethers } from "ethers";
import { RPCS, PrivateKey, BaseUrl } from "./const";

/**
 * Create limit order using Web3.js
 * This function creates a limit order to exchange 0.1 USDC for 0.2 USDT using Web3.js.
 * @param chainId chain id
 * @param inToken in token info
 * @param outToken out token info
 * @returns order object
 */
export async function createWeb3(chainId, inToken, outToken) {
  try {
      const providerUrl = RPCS[chainId];
      // Web3.js setup
      const web3 = new Web3(providerUrl);
      const account = web3.eth.accounts.privateKeyToAccount(PrivateKey);
      web3.eth.accounts.wallet.add(account);

      // Initialize Web3.js WalletParams
      const web3Params: WalletParams = {
          provider: web3,
          chainId: chainId,
          chainKey: 'base',
          account: account.address,
      };

    // Get current gas price from the network
    const gasPrice = await web3.eth.getGasPrice();
    console.log('Web3 gasPrice:', gasPrice);

    // Build limit order data
    const orderData = await openoceanLimitOrderSdk.createLimitOrder(
      web3Params,
      {
        makerTokenAddress: inToken.address,
        makerTokenDecimals: inToken.decimals,
        takerTokenAddress: outToken.address,
        takerTokenDecimals: outToken.decimals,
        makerAmount: inToken.amount,
        takerAmount: outToken.amount,
        gasPrice: parseInt((Number(gasPrice) * 1.2) + ''),
        expire: '6Month'
      }
    );

    // Submit the order to OpenOcean API
    const result = await axios.post(
      `${BaseUrl}/v1/${chainId}/limit-order`,
      orderData,
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    console.log('Web3.js create order result:', result.data);
    return result.data;
  } catch (error) {
    console.error('Web3.js create order failed:', error);
    throw error;
  }
}

/**
 * Create limit order using Ethers.js
 * This function creates a limit order to exchange 0.1 USDC for 0.2 USDT using Ethers.js.
 * @param chainId chain id
 * @param inToken in token info
 * @param outToken out token info
 * @returns order object
 */
export async function createEthers(chainId, inToken, outToken) {
  try {
      const providerUrl = RPCS[chainId];
      // Ethers.js setup
      //ethers v5
      const ethersProvider = new ethers.providers.JsonRpcProvider(providerUrl)
      const ethersSigner = new ethers.Wallet(PrivateKey, ethersProvider);

      // Initialize Ethers.js WalletParams
      const ethersParams: WalletParams = {
          provider: ethersProvider,
          chainId: chainId,
          chainKey: 'base',
          account: ethersSigner.address,

          signer: ethersSigner
      };

    // Get current gas price from the network
    const feeData = await ethersProvider.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(0);
    console.log('Ethers gasPrice:', gasPrice);

    // Build limit order data
    const orderData = await openoceanLimitOrderSdk.createLimitOrder(
      ethersParams,
      {
        makerTokenAddress: inToken.address,
        makerTokenDecimals: inToken.decimals,
        takerTokenAddress: outToken.address,
        takerTokenDecimals: outToken.decimals,
        makerAmount: inToken.amount,
        takerAmount: outToken.amount,
        gasPrice: parseInt((Number(gasPrice) * 1.2) + ''),
        expire: '6Month'
      }
    );

    // Submit the order to OpenOcean API
    const result = await axios.post(
      `${BaseUrl}/v1/${chainId}/limit-order`,
      orderData,
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    console.log('Ethers.js create order result:', result.data);
    return result.data;
  } catch (error) {
    console.error('Ethers.js create order failed:', error);
    throw error;
  }
}
