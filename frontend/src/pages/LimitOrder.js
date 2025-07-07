import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { openoceanLimitOrderSdk } from '@openocean.finance/limitorder-sdk';
import axios from 'axios';
import {
  supportedChains,
  switchToSupportedChain,
  getCurrentChainId,
  isChainSupported
} from '../utils/chainUtils';
import './Pages.css';

/**
 * LimitOrder Component - Handles limit order creation and management
 * Allows users to create and manage limit orders for token trading
 */
const LimitOrder = () => {
  // Wallet connection state
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAccount, setWalletAccount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState(null);
  const [currentChainId, setCurrentChainId] = useState(null);

  // Limit order state - maker and taker amounts
  const [makerAmount, setMakerAmount] = useState(0.01);
  const [takerAmount, setTakerAmount] = useState(0.02);
  const [expireTime, setExpireTime] = useState('1H');

  // Orders list state
  const [orders, setOrders] = useState([]);

  // Chain configuration
  const chain = {
    chainId: 8453,
    chainName: 'base',
  }

  // Token configuration for trading pair
  const inToken = {
    "address": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    "decimals": 6,
    "symbol": "USDC",
  };

  const outToken = {
    "address": "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2",
    "decimals": 6,
    "symbol": "USDT"
  };

  // Available expiration time options for limit orders
  const limitOrderExpireOptions = [
    { value: "10M", label: "10 Mins" },
    { value: "1H", label: "1 Hour" },
    { value: "1D", label: "1 Day" },
    { value: "3D", label: "3 Days" },
    { value: "7D", label: "7 Days" },
    { value: "30D", label: "1 Month" },
    { value: "3Month", label: "3 Month" },
    { value: "6Month", label: "6 Month" },
    { value: "1Y", label: "1 Year" }
  ];

  // Initialize component on mount
  useEffect(() => {
    checkWalletConnection();
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

      setProvider(provider);
      setWalletAccount(address);
      setIsWalletConnected(true);
      getLimitOrder(address);

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
    setProvider(null);
    console.log('Wallet disconnected');
  };

  /**
   * Create a new limit order
   * Handles order creation using OpenOcean SDK and API
   */
  const createLimitOrder = async () => {
    if (!isWalletConnected) {
      alert('Please connect your wallet first!');
      return;
    }

    if (!makerAmount || !takerAmount) {
      alert('Please enter price and amount!');
      return;
    }

    try {
      setIsLoading(true);

      if (!provider) {
        alert('Please connect wallet first')
        return
      }
      
      const gasPrice = await getGasPrice();
      const providerParams = {
        provider: provider,
        chainKey: chain.chainName,
        account: walletAccount,
        chainId: chain.chainId
      }
      
      // Prepare order parameters
      const params = {
        makerTokenAddress: inToken.address,
        makerTokenDecimals: inToken.decimals,
        takerTokenAddress: outToken.address,
        takerTokenDecimals: outToken.decimals,
        makerAmount: makerAmount * (10 ** inToken.decimals) + '',
        takerAmount: takerAmount * (10 ** outToken.decimals) + '',
        gasPrice: gasPrice,
        expire: expireTime,
      }
      
      // Create limit order using SDK
      let order = await openoceanLimitOrderSdk.createLimitOrder(
        providerParams,
        params
      );

      // Submit order to OpenOcean API
      const result = await axios.post(
        `https://open-api.openocean.finance/v1/${chain.chainId}/limit-order`,
        order,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      await getLimitOrder();

      console.log('Limit order created:', result.data);
      alert('Limit order created successfully!');

      setMakerAmount('');
      setTakerAmount('');
    } catch (error) {
      console.error('Error creating limit order:', error);
      alert('Failed to create limit order: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cancel an existing limit order
   * Handles order cancellation through API and blockchain
   */
  const cancelOrder = async (order) => {
    try {
      const { orderHash } = order;
      
      // Cancel order through API
      const { data } = await axios.post(
        `https://open-api.openocean.finance/v1/${chain.chainId}/limit-order/cancelLimitOrder`,
        { orderHash }
      );
      
      const { status } = (data && data.data) || {};
      
      // If order is still active, cancel on blockchain
      if (status && !(status === 3 || status === 4)) {
        const gasPrice = await getGasPrice();
        await openoceanLimitOrderSdk.cancelLimitOrder(
          {
            provider: provider,
            chainKey: chain.chainName,
            account: walletAccount,
            chainId: chain.chainId
          },
          {
            orderData: order.data,
            gasPrice,
          }
        );
      }
      
      await getLimitOrder();
      alert('Order cancelled successfully!');
    } catch (error) {
      console.error('Error canceling order:', error);
      alert('Failed to cancel order: ' + error.message);
    }
  };

  /**
   * Fetch user's limit orders from OpenOcean API
   */
  const getLimitOrder = async (account) => {
    let url = `https://open-api.openocean.finance/v1/${chain.chainId}/limit-order/address/${walletAccount || account}?page=1&limit=100&statuses=[1,2,5]&sortBy=createDateTime&exclude=0`
    const res = await axios.get(url);
    setOrders(res.data.data)
  }

  /**
   * Get current gas price with 20% buffer
   */
  const getGasPrice = async () => {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice?.toString();
    return parseInt(Number(gasPrice) * 1.2);
  }

  /**
   * Format wallet address for display
   */
  const formatAddress = (address) => {
    return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
  };

  /**
   * Format date string for display
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  /**
   * Get human-readable status text for order status
   */
  const getStatusText = (status) => {
    const statusMap = {
      1: 'Pending',
      2: 'Active',
      3: 'Filled',
      4: 'Cancelled',
      5: 'Expired'
    };
    return statusMap[status] || 'Unknown';
  };

  /**
   * Get color for order status display
   */
  const getStatusColor = (status) => {
    const colorMap = {
      1: '#ffc107', // Pending - Yellow
      2: '#28a745', // Active - Green
      3: '#007bff', // Filled - Blue
      4: '#dc3545', // Cancelled - Red
      5: '#6c757d'  // Expired - Gray
    };
    return colorMap[status] || '#6c757d';
  };

  return (
    <div className="page">
      <h1>Limit Order</h1>
      <div className="page-content">
        <p>Create and manage limit orders for {inToken.symbol}/{outToken.symbol} trading pair on Base network.</p>

        {/* Wallet Connection Section */}
        <div className="wallet-section">
          {!isWalletConnected ? (
            <div className="wallet-notice">
              <p>⚠️ Please connect your MetaMask wallet to use Limit Order functionality</p>
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

        {/* Limit Order Form */}
        <div className="limit-order-form">
          <div>
            <span>
              Trading Pair  <i style={{ fontSize: '0.8rem', color: 'red' }}>{chain.chainName}</i>
            </span>
            <span>{inToken.symbol}/{outToken.symbol}</span>
          </div>

          {/* Maker and Taker Amount Inputs */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
            <div className="form-group" style={{ width: '50%' }}>
              <label htmlFor="makerAmount">Maker Amount ({inToken.symbol})</label>
              <input
                id="makerAmount"
                type="number"
                placeholder="Enter maker amount"
                value={makerAmount}
                onChange={(e) => setMakerAmount(e.target.value)}
                disabled={!isWalletConnected}
                min="0"
                step="0.000001"
              />
            </div>

            <div className="form-group" style={{ width: '50%' }}>
              <label htmlFor="takerAmount">Taker Amount ({outToken.symbol})</label>
              <input
                id="takerAmount"
                type="number"
                placeholder="Enter taker amount"
                value={takerAmount}
                onChange={(e) => setTakerAmount(e.target.value)}
                disabled={!isWalletConnected}
                min="0"
                step="0.000001"
              />
            </div>
          </div>

          {/* Expiration Time Selection */}
          <div className="form-group" style={{ marginTop: '10px' }}>
            <label htmlFor="expireTime">Time in Force</label>
            <select
              id="expireTime"
              value={expireTime}
              onChange={(e) => setExpireTime(e.target.value)}
              disabled={!isWalletConnected}
            >
              {limitOrderExpireOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Create Order Button */}
          <button
            className="limit-order-button"
            onClick={createLimitOrder}
            disabled={!isWalletConnected || !takerAmount || !makerAmount || isLoading}
          >
            {isLoading ? 'Creating...' :
              !isWalletConnected ? 'Connect Wallet to Create Order' :
                !takerAmount || !makerAmount ? 'Enter Price and Amount' : 'Create Limit Order'}
          </button>
        </div>

        {/* Orders List Section */}
        <div className="orders-section">
          <h3>Your Orders</h3>
          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
              <p>No orders found</p>
              <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>Create your first limit order above</p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="order-item">
                <div className="order-info">
                  <div className="order-pair">
                    <strong>Date</strong><br />
                    {formatDate(order.createDateTime)}
                  </div>
                  <div className="order-type">
                    <strong>Maker</strong><br />
                    {(order.makerAmount / 10 ** inToken.decimals).toFixed(6)} {inToken.symbol}
                  </div>
                  <div className="order-price">
                    <strong>Taker</strong><br />
                    {(order.takerAmount / 10 ** outToken.decimals).toFixed(6)} {outToken.symbol}
                  </div>
                  <div className="order-amount">
                    <strong>Price</strong><br />
                    {((order.takerAmount / 10 ** outToken.decimals) / (order.makerAmount / 10 ** inToken.decimals)).toFixed(6)}
                  </div>
                  <div className="order-status" style={{ color: getStatusColor(order.statuses) }}>
                    <strong>Status</strong><br />
                    {getStatusText(order.statuses)}
                  </div>
                </div>
                <button
                  onClick={() => cancelOrder(order)}
                  className="cancel-button"
                  disabled={order.statuses === 3 || order.statuses === 4}
                >
                  {order.statuses === 3 || order.statuses === 4 ? 'Completed' : 'Cancel'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LimitOrder; 