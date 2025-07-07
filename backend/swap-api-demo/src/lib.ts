import axios from "axios";
import BigNumber from 'bignumber.js';
import { ethers, Contract } from "ethers";
import { RPCS, BaseUrl, PrivateKey, ApproveContract } from "./const";
import abi from './abis/ercAbi.json';

const approveContract = ApproveContract;
const chain = '8453';
const providerUrl = RPCS[chain];
const provider = new ethers.providers.JsonRpcProvider(providerUrl)
const wallet = new ethers.Wallet(PrivateKey, provider);

const inToken = {
  "address": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  "decimals": 6,
  "symbol": "USDC",
  "amount": '10000000',
}
// Token configuration for WETH
const outToken = {
  "address": "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2",
  "decimals": 6,
  "symbol": "USDT",
  "amount": '10000000',
}

export async function getGasPrice() {
  const { data } = await axios({
    url: `${BaseUrl}/v4/${chain}/gasPrice`,
    method: 'GET',
  });

  const gasPrice = data?.without_decimals?.standard;
  console.log(`gasPrice is ${gasPrice} Gwei`);

  return gasPrice;
}

export async function getTokenList() {
  const { data } = await axios({
    url: `${BaseUrl}/v4/${chain}/tokenList`,
    method: 'GET',
  });

  const tokenList = data?.data;
  console.log(tokenList);

  return tokenList;
}

export async function allowance() {
  const { data } = await axios({
    url: `${BaseUrl}/v4/${chain}/allowance`,
    method: 'GET',
    params: {
      account: wallet.address, // wallet address
      inTokenAddress: inToken.address // usdt token address
    }
  })
  console.log(data)
  const allowance = data?.data[0]?.allowance;
  console.log(`usdt allowance is ${allowance}`);
  return allowance;
}

export async function approve() {
  const inTokenAddress = inToken.address; // token address
  const contract = await new Contract(inTokenAddress, abi, wallet); // abi, erc20 abi
  try {
    await contract.approve(approveContract, new BigNumber('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff').toFixed(0, 1));
  } catch (error) {
    return error;
  }
  return true;
}


export async function quote() {
  const { data } = await axios.get( `${BaseUrl}/v4/${chain}/quote`, {
    params: {
      chain,
      inTokenAddress: inToken.address,
      outTokenAddress: outToken.address,
      amountDecimals: inToken.amount,
      gasPrice: 1,
      slippage:1,
    }
  });
  console.log(data);
  return data;
}


export async function swap() {
  const params = {
    inTokenAddress: inToken.address,
    outTokenAddress: outToken.address,
    slippage: 1, // 1 means 1%
    amountDecimals: inToken.amount,
    gasPrice: 1, // without decimals, get from gasPrice api
    account: wallet.address
  }
  const { data } = await axios({
    url: `${BaseUrl}/v4/${chain}/swap`,
    method: 'GET',
    params
  })
  console.log(data)
  return data;
}
