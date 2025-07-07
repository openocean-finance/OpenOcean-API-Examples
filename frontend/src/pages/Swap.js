import React, { useState, useEffect } from 'react';
import {
  supportedChains,
  switchToSupportedChain,
  getCurrentChainId,
  isChainSupported
} from '../utils/chainUtils';
import './Pages.css';
import axios from 'axios';
import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';

/**
 * Swap Component - Handles token swapping functionality
 * Allows users to exchange tokens using OpenOcean API
 */
const Swap = () => {

  // Token state for input and output tokens
  const [inToken, setInToken] = useState({
    address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    symbol: 'USDC',
    decimals: 6
  });
  const [outToken, setOutToken] = useState({
    address: '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2',
    symbol: 'USDT',
    decimals: 6
  });
  
  // Ethereum provider and transaction state
  const [provider, setProvider] = useState(null);
  const [fromAmount, setFromAmount] = useState('0.1');
  const [toAmount, setToAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [isLoading, setIsLoading] = useState(false);
  const [gasPrice, setGasPrice] = useState(10000);
  
  // Quote data from API
  const [quote, setQuote] = useState({
    inAmount: 0,
    outAmount: 0,
    inAmountDecimals: 0,
    outAmountDecimals: 0,
    inTokenAddress: '',
    outTokenAddress: '',
    gasPrice: 0
  });

  // Wallet connection state
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAccount, setWalletAccount] = useState('');
  const [currentChainId, setCurrentChainId] = useState(null);
  const [tokens, setTokens] = useState([]);

  // Chain configuration
  const chain = {
    chainId: 8453,
    chainName: 'base',
  }
  
  // Initialize component on mount
  useEffect(() => {
    checkWalletConnection();
    getTokens();
    getQuote();
  }, []);

  /**
   * Check if wallet is already connected on component mount
   */
  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          await connectWallet();
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  };

  /**
   * Connect to MetaMask wallet and handle chain switching
   */
  const connectWallet = async () => {
    setIsLoading(true);
    try {
      if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask!');
        return;
      }

      await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      // Get current chain ID
      const chainId = await getCurrentChainId();
      setCurrentChainId(chainId);

      // Check if current chain is supported
      if (chainId != chain.chainId) {
        const shouldSwitch = window.confirm(
          `Current chain (${chainId}) is not supported. Would you like to switch to Base?`
        );

        if (shouldSwitch) {
          const switched = await switchToSupportedChain(chain.chainId);
          if (!switched) {
            alert('Failed to switch to supported chain. Please switch manually.');
            setIsLoading(false);
            return;
          }
          // Update chain ID after switch
          const newChainId = await getCurrentChainId();
          setCurrentChainId(newChainId);
        } else {
          setIsLoading(false);
          return;
        }
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice;
      setGasPrice(Number(gasPrice));
      setProvider(provider);
      setWalletAccount(address);
      setIsWalletConnected(true);

      console.log('Wallet connected:', address, 'on chain:', chainId);

      // Listen for account changes
      window.ethereum.on('accountsChanged', (newAccounts) => {
        if (newAccounts.length > 0) {
          connectWallet();
        } else {
          disconnectWallet();
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', (chainId) => {
        const newChainId = parseInt(chainId, 16);
        setCurrentChainId(newChainId);

        if (!isChainSupported(newChainId)) {
          alert(`Chain ${newChainId} is not supported. Please switch to a supported chain.`);
          setIsWalletConnected(false);
        }
      });
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Disconnect wallet and reset state
   */
  const disconnectWallet = () => {
    setWalletAccount('');
    setIsWalletConnected(false);
    setCurrentChainId(null);
    console.log('Wallet disconnected');
  };

  /**
   * Check if token is native (ETH/WETH)
   */
  const isNativeToken = (tokenAddress, chainId) => {
    return tokenAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
  }

  /**
   * Execute token swap transaction
   * Handles token approval and swap execution
   */
  const handleSwap = async () => {
    if (!isWalletConnected) {
      alert('Please connect your wallet first!');
      return;
    }

    try {
      setIsLoading(true);

      const fromAmountDecimals = fromAmount * 10 ** inToken.decimals;
      let params = {
        inTokenAddress: inToken.address,
        outTokenAddress: outToken.address,
        amountDecimals: fromAmountDecimals,
        slippage: slippage * 100,
        gasPrice: gasPrice,
        account: walletAccount,
      }

      // Get swap quote from OpenOcean API
      let url = `https://open-api.openocean.finance/v4/${chain.chainId}/swap?${Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&')}`
      let res = await axios.get(url);

      const { inToken, inAmount, data, to, gasPrice: swapGasPrice } = res.data.data;
      let swapParams = {
        from: walletAccount,
        to,
        data,
        gasPrice: swapGasPrice
      };

      // Handle token approval for non-native tokens
      if (!isNativeToken(inToken.address, chain.chainId)) {
        let approveAmount = fromAmountDecimals;
        // approveAmount = BigNumber('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF').toFixed(0);
        await checkTokenApprove(inToken.address, to, fromAmountDecimals, gasPrice, approveAmount);
      } else {
        swapParams.value = inAmount;
      }

      console.log('sendEthTransaction swapParams', JSON.stringify(swapParams));

      // Validate transaction parameters
      if (!swapParams.to || !swapParams.data) {
        throw new Error('Invalid transaction parameters');
      }

      // Execute the swap transaction
      try {
        const signer = await provider.getSigner();
        const tx = await signer.sendTransaction(swapParams);
        const receipt = await tx.wait();

        console.log('Transaction successful:', receipt);
        alert('Swap completed successfully!');
        setFromAmount('');
        setToAmount('');
      } catch (txError) {
        console.error('Transaction failed:', txError);
        alert('Transaction failed: ' + txError.message);
      }

    } catch (error) {
      console.error('Error executing swap:', error);
      alert('Failed to execute swap: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle input amount changes and trigger quote update
   */
  const handleFromAmountChange = (value) => {
    if (Number(value) <= 0) {
      return;
    }
    setFromAmount(value);
    setToAmount('');
    if (fromAmount) {
      getQuote();
    }
  };

  /**
   * Switch input and output tokens
   */
  const handleTokenSwitch = () => {
    setInToken(outToken);
    setOutToken(inToken);
    // setFromAmount(toAmount);
    setToAmount('');
    getQuote();
  };

  /**
   * Format wallet address for display
   */
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  /**
   * Fetch available tokens from OpenOcean API
   */
  const getTokens = async () => {
    let url = `https://open-api.openocean.finance/v4/${chain.chainId}/tokenList`
    const { data } = await axios.get(url);
    console.log(data.data);
    setTokens(data.data);
  };

  /**
   * Get swap quote from OpenOcean API
   */
  const getQuote = async () => {
    if (!fromAmount) return;
    setIsLoading(true);
    try {
      let url = `https://open-api.openocean.finance/v4/${chain.chainId}/quote?inTokenAddress=${inToken.address}&outTokenAddress=${outToken.address}&amountDecimals=${fromAmount * 10 ** inToken.decimals}&slippage=${slippage * 100}&gasPrice=${gasPrice}`
      const { data } = await axios.get(url);
      console.log(data);
      setQuote(data.data);
      setToAmount(Number(data.data.outAmount) / (10 ** outToken.decimals));
    } catch (error) {
      console.error('Error getting quote:', error);
      setToAmount('');
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Change selected token (input or output)
   */
  const changeToken = (token, type) => {
    if (type === 'from') {
      setInToken(token);
    } else {
      setOutToken(token);
    }
    setToAmount('');
    getQuote();
  }

  /**
   * Check and handle token approval for swap contract
   */
  const checkTokenApprove = async (
    tokenAddress,
    contractAddress,
    amount,
    gasPrice,
    approveAmount
  ) => {
    // Get current allowance
    const allowance = await getTokenAllowance(tokenAddress, contractAddress);

    if (BigNumber(allowance).comparedTo(amount) < 0) {
      return await approveToken(
        tokenAddress,
        contractAddress,
        approveAmount || amount,
        gasPrice
      );
    }
    return true;
  };

  /**
   * Get token allowance for a specific contract
   */
  const getTokenAllowance = async (tokenAddress, contractAddress) => {
    try {
      // ERC20 ABI for allowance function
      const erc20Abi = [
        {
          "constant": true,
          "inputs": [
            {
              "name": "_owner",
              "type": "address"
            },
            {
              "name": "_spender",
              "type": "address"
            }
          ],
          "name": "allowance",
          "outputs": [
            {
              "name": "",
              "type": "uint256"
            }
          ],
          "type": "function"
        }
      ];
      const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);
      const allowance = await tokenContract.allowance(walletAccount, contractAddress);
      return allowance
    } catch (error) {
      console.error('Error checking token approval:', error);
      return 0;
    }
  };

  /**
   * Approve token spending for swap contract
   */
  const approveToken = async (tokenAddress, contractAddress, maxAmount, gasPrice) => {
    try {
      // ERC20 ABI for approve function
      const erc20Abi = [
        {
          "constant": false,
          "inputs": [
            {
              "name": "_spender",
              "type": "address"
            },
            {
              "name": "_value",
              "type": "uint256"
            }
          ],
          "name": "approve",
          "outputs": [
            {
              "name": "",
              "type": "bool"
            }
          ],
          "type": "function"
        }
      ];

      const signer = await provider.getSigner();

      const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, signer);

      const tx = await tokenContract.approve(contractAddress, maxAmount, {
        gasPrice: gasPrice
      });

      const receipt = await tx.wait(); // Wait for transaction confirmation

      console.log('Approval successful:', receipt);
      alert('Token approved successfully!');
      return true;
    } catch (error) {
      console.error('Error approving token:', error);
      alert('Failed to approve token: ' + error.message);
      return false;
    }
  };

  return (
    <div className="page">
      <h1>Swap</h1>
      <div className="page-content">
        <p>This is the Swap page for token exchange functionality.</p>

        {/* Wallet Connection Section */}
        <div className="wallet-section">
          {!isWalletConnected ? (
            <div className="wallet-notice">
              <p>⚠️ Please connect your MetaMask wallet to use Swap functionality</p>
              <button
                className="connect-button"
                onClick={connectWallet}
                disabled={isLoading}
              >
                {isLoading ? 'Connecting...' : 'Connect MetaMask'}
              </button>
            </div>
          ) : (
            <div className="wallet-status">
              <p>✅ Connected: {formatAddress(walletAccount)}</p>
              <p>🌐 Chain: {supportedChains[currentChainId]?.name || `Chain ${currentChainId}`}</p>
              <button
                className="disconnect-button"
                onClick={disconnectWallet}
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        {/* Swap Form */}
        <div className="swap-form">
          <div>
            <span>
              Trading Pair  <i style={{ fontSize: '0.8rem', color: 'red' }}>{chain.chainName}</i>
            </span>
            <span>{inToken.symbol}/{outToken.symbol}</span>
          </div>

          {/* Input Token Section */}
          <div className="form-group">
            <label>From</label>
            <div className="token-input-group">
              <input
                type="text"
                placeholder="Enter token amount"
                value={fromAmount}
                onChange={(e) => handleFromAmountChange(e.target.value)}
                disabled={!isWalletConnected}
                
              />
              <select
                value={inToken.address}
                onChange={(e) => changeToken(tokens.find(token => token.address === e.target.value), 'from')}
                disabled={!isWalletConnected}
              >
                {tokens.map((token) => (
                  <option key={token.address} value={token.address}>{token.symbol}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Token Switch Arrow */}
          <div className="swap-arrow" onClick={handleTokenSwitch}>
          </div>

          {/* Output Token Section */}
          <div className="form-group">
            <label>To</label>
            <div className="token-input-group">
              <input
                type="text"
                placeholder="Output amount"
                value={toAmount}
                readOnly
                disabled
                style={{ background: 'rgba(0,0,0,0.1)', cursor: 'not-allowed' }}
              />
              <select
                value={outToken.address}
                onChange={(e) => changeToken(tokens.find(token => token.address === e.target.value), 'to')}
                disabled={!isWalletConnected}
              >
                {tokens.map((token) => (
                  <option key={token.address} value={token.address}>{token.symbol}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Slippage Settings */}
          <div className="form-group" style={{ marginTop: '20px' }}>
            <label>Slippage Tolerance (%)</label>
            <input
              type="number"
              placeholder="0.5"
              value={slippage}
              onChange={(e) => setSlippage(parseFloat(e.target.value) || 0.5)}
              min="0.1"
              max="50"
              step="0.1"
              disabled={!isWalletConnected}
            />
          </div>

          {/* Swap Details Display */}
          {fromAmount && toAmount && (
            <div className="swap-details">
              <h3>Swap Details</h3>
              <div className="detail-row">
                <span>Exchange Rate:</span>
                <span>1 {inToken.symbol} = {(toAmount / Number(fromAmount)).toFixed(6)} {outToken.symbol}</span>
              </div>
              <div className="detail-row">
                <span>You will receive:</span>
                <span>{toAmount} {outToken.symbol}</span>
              </div>
              <div className="detail-row">
                <span>Network:</span>
                <span>{supportedChains[currentChainId]?.name || `Chain ${currentChainId}`}</span>
              </div>
            </div>
          )}

          {/* Swap Button */}
          <button
            className="swap-button"
            onClick={handleSwap}
            disabled={!isWalletConnected || !fromAmount || isLoading}
          >
            {isLoading ? 'Processing...' :
              !isWalletConnected ? 'Connect Wallet to Swap' :
                !fromAmount ? 'Enter Amount to Swap' : 'Swap'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Swap; 