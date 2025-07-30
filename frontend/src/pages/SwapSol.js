import React, { useState, useEffect } from 'react';
import {
  supportedChains,
} from '../utils/chainUtils';
import './Pages.css';
import axios from 'axios';
import { VersionedTransaction, Connection, Transaction } from '@solana/web3.js';

/**
 * Swap Component - Handles token swapping functionality
 * Allows users to exchange tokens using OpenOcean API
 */
const Swap = () => {

  // Token state for input and output tokens
  const [inToken, setInToken] = useState({
    address: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    decimals: 9
  });
  const [outToken, setOutToken] = useState({
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    decimals: 6
  });
  
  // Ethereum provider and transaction state
  const [provider, setProvider] = useState(null);
  const [fromAmount, setFromAmount] = useState('0.001');
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
    chainId: 'solana',
    chainName: 'solana',
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
    if (typeof window.solana !== 'undefined' && window.solana.isPhantom) {
      try {
        const response = await window.solana.connect({ onlyIfTrusted: true });
        if (response.publicKey) {
          await connectWallet();
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  };

  /**
   * Connect to Phantom wallet
   */
  const connectWallet = async () => {
    setIsLoading(true);
    try {
      if (typeof window.solana === 'undefined' || !window.solana.isPhantom) {
        alert('Please install Phantom wallet!');
        return;
      }

      const response = await window.solana.connect();
      const publicKey = response.publicKey.toString();

      // Set Solana connection
      const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

      setProvider(connection);
      setWalletAccount(publicKey);
      setIsWalletConnected(true);
      setCurrentChainId('solana');

      console.log('Phantom wallet connected:', publicKey);

      // Listen for account changes
      window.solana.on('accountChanged', (publicKey) => {
        if (publicKey) {
          setWalletAccount(publicKey.toString());
        } else {
          disconnectWallet();
        }
      });

      // Listen for disconnect
      window.solana.on('disconnect', () => {
        disconnectWallet();
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
    if (window.solana && window.solana.isPhantom) {
      window.solana.disconnect();
    }
    setWalletAccount('');
    setIsWalletConnected(false);
    setCurrentChainId(null);
    setProvider(null);
    console.log('Phantom wallet disconnected');
  };

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
        account: walletAccount,
        gasPrice: gasPrice
      }

      // Get swap quote from OpenOcean API
      let url = `https://open-api.openocean.finance/v4/${chain.chainId}/swap?${Object.entries(params).map(([key, value]) => `${key}=${value}`).join('&')}`
      let res = await axios.get(url);
      debugger
      const { dexId, data } = res.data.data;
      // For Solana, we need to handle transaction data
      if (!data) {
        throw new Error('Invalid transaction parameters');
      }

      // Handle Solana transaction
      try {
        let transaction = ''
        if (dexId == 6 || dexId == 7) {
          transaction = VersionedTransaction.deserialize(
            Buffer.from(data, 'hex')
          );
        } else {
          transaction = Transaction.from(
            Buffer.from(data, "hex")
          );
        }

        // Sign and send transaction
        const signedTransaction = await window.solana.signTransaction(transaction);
        const signature = await provider.sendRawTransaction(signedTransaction.serialize({
          verifySignatures: false,
          requireAllSignatures: false
        }));

        // Wait for confirmation
        const confirmation = await provider.confirmTransaction(signature, 'confirmed');

        console.log('Swap successful:', signature);
        alert('Swap completed!');
        setFromAmount('');
        setToAmount('');
      } catch (txError) {
        console.error('Swap failed:', txError);
        alert('Swap failed: ' + txError.message);
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
    // 使用当前输入的值而不是状态中的旧值
    if (value) {
      getQuote(value);
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
    if (fromAmount) {
      getQuote();
    }
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
  const getQuote = async (value) => {
    if (!fromAmount) return;
    setIsLoading(true);
    try {
      let url = `https://open-api.openocean.finance/v4/${chain.chainId}/quote?inTokenAddress=${inToken.address}&outTokenAddress=${outToken.address}&amountDecimals=${(value || fromAmount) * 10 ** inToken.decimals}&slippage=${slippage * 100}&gasPrice=${gasPrice}`
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

  return (
    <div className="page">
      <h1>Swap</h1>
      <div className="page-content">
        <p>This is the Swap page for token exchange functionality.</p>

        {/* Wallet Connection Section */}
        <div className="wallet-section">
          {!isWalletConnected ? (
            <div className="wallet-notice">
              <p>⚠️ Please connect your Phantom wallet to use Swap functionality</p>
              <button
                className="connect-button"
                onClick={connectWallet}
                disabled={isLoading}
              >
                {isLoading ? 'Connecting...' : 'Connect Phantom'}
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