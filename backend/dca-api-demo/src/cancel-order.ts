import axios from "axios";
import { openoceanLimitOrderSdk, WalletParams } from "@openocean.finance/limitorder-sdk";
import Web3 from "web3";
import { ethers } from "ethers";
import { RPCS, PrivateKey, BaseUrl } from "./const";

/**
 * Cancel dca order using Web3.js
 * This function cancels the first order in the user's order list using Web3.js.
 * @param chainId chain id
 * @param order order object
 * @returns 'success'
 */
export async function cancelWeb3(chainId, order) {
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
      mode: 'Dca'
    };

    // Try to cancel via OpenOcean API
    const result = await axios.post(
      `${BaseUrl}/v1/${chainId}/dca/cancel`,
      { orderHash: order.orderHash }
    );

    // If API cancellation fails, try on-chain cancellation
    const { status } = (result && result.data && result.data.data) || {};
    console.log('Web3.js cancel order result:', result.data.data);
    if (!(status === 3 || status === 4)) {
      const gasPrice = await web3.eth.getGasPrice();
      console.log('Web3 gasPrice:', gasPrice);
      const res = await openoceanLimitOrderSdk.cancelLimitOrder(
        web3Params,
        {
          orderData: order.data,
          // gasPrice: gasPrice.toString(),
        }
      );
      console.log('Web3.js cancel order result:', res);
      return res;
    }
  } catch (error) {
    console.error('Web3.js cancel order failed:', error);
    throw error;
  }
}

/**
 * Cancel dca order using Ethers.js
 * This function cancels the first order in the user's order list using Ethers.js.
 * @param chainId chain id
 * @param order order object
 * @returns 'success'
 */
export async function cancelEthers(chainId, order) {
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
      mode: 'Dca',

      signer: ethersSigner
    };

    // Try to cancel via OpenOcean API
    const result = await axios.post(
      `${BaseUrl}/v1/${chainId}/dca/cancel`,
      { orderHash: order.orderHash }
    );

    console.log('Ethers.js cancel order result:', result.data.data);
    const { status } = (result && result.data && result.data.data) || {};
    if (!(status === 3 || status === 4)) {
      const feeData = await ethersProvider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(0);

      const res = await openoceanLimitOrderSdk.cancelLimitOrder(
        ethersParams,
        {
          orderData: order.data,
          gasPrice: gasPrice.toString(),
        }
      );
      console.log('Ethers.js cancel order result:', res);
      return res;
    }
  } catch (error) {
    console.error('Ethers.js cancel order failed:', error);
    throw error;
  }
}
