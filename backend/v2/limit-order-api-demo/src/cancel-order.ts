import axios from "axios";
import { ethers } from "ethers";
import { PrivateKey, BaseUrl } from "./const";

/**
 * Cancel limit order using Ethers.js
 * This function cancels the first order in the user's order list using Ethers.js.
 * @param chainId chain id
 * @param order order object
 * @returns 'success'
 */
export async function cancelEthers(chainId, orderHash) {
  try {
    const wallet = new ethers.Wallet(PrivateKey);
    const message = `orderHash:\n${orderHash}`;
    const signature = await wallet.signMessage(message);

    // Try to cancel via OpenOcean API
    const result = await axios.post(
      `${BaseUrl}/v2/${chainId}/limit-order/cancelLimitOrder`,
      { orderHash, signature }
    );

    // If API cancellation fails, try on-chain cancellation
    console.log('Web3.js cancel order result:', result.data.data);
  } catch (error) {
    console.error('Web3.js cancel order failed:', error);
    throw error;
  }
}
