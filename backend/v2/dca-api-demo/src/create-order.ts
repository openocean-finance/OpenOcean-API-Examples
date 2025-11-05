import axios from "axios";
import { ethers } from "ethers";
import { PrivateKey, BaseUrl } from "./const";

/**
 * Create dca order using Ethers.js
 * This function creates a dca order to exchange 0.1 USDC for 0.2 USDT using Ethers.js.
 * @param chainId chain id
 * @param inToken in token info
 * @param outToken out token info
 * @returns order object
 */
export async function createEthers(chainId, inToken, outToken) {
  try {
    // Ethers.js setup
    //ethers v5
    const wallet = new ethers.Wallet(PrivateKey);
    const message = `makerAsset:\n${inToken.address}\ntakerAsset:\n${outToken.address}\nmakerAmount:\n${inToken.amount}`;
    const signature = await wallet.signMessage(message);

    let order = {
      makerAsset: inToken.address,
      takerAsset: outToken.address,
      makerAmount: inToken.amount,
      orderMaker: wallet.address,
      signature,
      minPrice: 0,
      maxPrice: 0,
      time: 60, // 1 Minute
      times: 2,
      referrer: '',
      referrerFee: 0,
      enabledDexIds: '',
      disabledDexIds: ''
    }
    // Submit the order to OpenOcean API
    const result = await axios.post(
      `${BaseUrl}/v2/${chainId}/dca/swap`,
      order,
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
