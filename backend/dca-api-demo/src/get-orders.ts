import axios from "axios";
import { BaseUrl } from "./const";

/**
 * Get user's dca order list
 * This function fetches the user's dca orders with status 1 (active), 2 (filled), or 5 (expired).
 * @param chainId chain id
 * @param address User wallet address
 * @returns Array of order objects
 */
export async function getOrderList(chainId, address: string) {
  try {
    const reqUrl = `${BaseUrl}/v1/${chainId}/dca/address/${address}?page=1&limit=100&sortBy=createDateTime&exclude=0`
    const { data } = await axios.get(reqUrl);
    return data ? data.data : [];
  } catch (error) {
    console.error('Failed to get order list:', error);
    throw error;
  }
}

/**
 * Get all dca order list
 * This function fetches the all dca orders with status 1 (active), 2 (filled), or 5 (expired).
 * @param chainId chain id
 * @returns Array of order objects
 */
export async function getOrders(chainId) {
  try {
    const reqUrl = `${BaseUrl}/v1/${chainId}/dca/all?statuses=[1,3,4]&limit=1`
    const { data } = await axios.get(reqUrl);
    return data ? data.data : [];
  } catch (error) {
    console.error('Failed to get order list:', error);
    throw error;
  }
}
