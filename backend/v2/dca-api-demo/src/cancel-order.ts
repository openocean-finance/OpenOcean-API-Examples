import axios from "axios";
import { ethers } from "ethers";
import { PrivateKey, BaseUrl } from "./const";

/**
 * Cancel dca order using Ethers.js
 * This function cancels the first order in the user's order list using Ethers.js.
 * @param chainId chain id
 * @param order order object
 * @returns 'success'
 */
export async function cancelEthers(chainId, orderHash) {
  try {
    // Ethers.js setup
    //ethers v5
    const wallet = new ethers.Wallet(PrivateKey);
    const message = `orderHash:\n${orderHash}`;
    const signature = await wallet.signMessage(message);

    // Try to cancel via OpenOcean API
    const result = await axios.post(
      `${BaseUrl}/v2/${chainId}/dca/cancel`,
      { orderHash, signature }
    );

    console.log('Ethers.js cancel order result:', result.data.data);
  } catch (error) {
    console.error('Ethers.js cancel order failed:', error);
    throw error;
  }
}
