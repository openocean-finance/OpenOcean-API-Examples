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
 * DCA (Dollar Cost Averaging) Component - Handles DCA strategy creation and management
 * Allows users to create automated recurring buy orders for token accumulation
 */
const LimitOrder = () => {
  // Wallet connection state
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAccount, setWalletAccount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState(null);
  const [currentChainId, setCurrentChainId] = useState(null);

  // DCA strategy parameters
  const [makerAmount, setMakerAmount] = useState(10); // Total allocation amount
  const [everyUnit, setEveryUnit] = useState(60) // Time unit (seconds)
  const [time, setTime] = useState(1) // Time interval value
  const [frequency, setFrequency] = useState(2); // Number of trades to execute
  const [minPrice, setMinPrice] = useState(null); // Minimum price limit (optional)
  const [maxPrice, setMaxPrice] = useState(null); // Maximum price limit (optional)

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

  // Available time unit options for DCA intervals
  const everyUnitOptions = [
    {
      value: 60,
      label: "Minute",
    },
    {
      value: 60 * 60,
      label: "Hour",
    },
    {
      value: 60 * 60 * 24,
      label: "Day",
    },
    {
      value: 60 * 60 * 24 * 7,
      label: "Week",
    },
    {
      value: 60 * 60 * 24 * 30,
      label: "Month",
    }
  ]

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
   * Create a new DCA strategy
   * Handles DCA creation using OpenOcean SDK and API
   */
  const createLimitOrder = async () => {
    if (!isWalletConnected) {
      alert('Please connect your wallet first!');
      return;
    }

    if (!makerAmount) {
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
        chainId: chain.chainId,
        mode: 'Dca' // Specify DCA mode
      }
      
      // Prepare DCA parameters
      const params = {
        makerTokenAddress: inToken.address,
        makerTokenDecimals: inToken.decimals,
        takerTokenAddress: outToken.address,
        takerTokenDecimals: outToken.decimals,
        makerAmount: makerAmount * (10 ** inToken.decimals) + '',
        takerAmount: 1, // Default taker amount for DCA
        gasPrice: gasPrice,
        expire: '1H',
      }
      
      // Create limit order using SDK
      let orderData = await openoceanLimitOrderSdk.createLimitOrder(
        providerParams,
        params
      );

      // Prepare DCA order with additional parameters
      let order = {
        ...orderData,
        expireTime: 180,
        time: everyUnit * time, // Calculate total time interval
        times: frequency, // Number of trades
        version: 'v2',
        // minPrice:1,
        // maxPrice:2,
      }

      // Submit DCA order to OpenOcean API
      const { data } = await axios.post(
        `https://open-api.openocean.finance/v1/${chain.chainId}/dca/swap`,
        order,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (data.code == 400) {
        alert('Failed to create dca: ' + data.error);
        return;
      }

      await getLimitOrder();

      console.log('Limit order created:', data);
      alert('Limit order created successfully!');

      setMakerAmount('');
    } catch (error) {
      console.error('Error creating dca:', error);
      alert('Failed to create dca: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cancel an existing DCA order
   * Handles order cancellation through API and blockchain
   */
  const cancelOrder = async (order) => {
    try {
      const { orderHash } = order;
      
      // Cancel order through API
      const { data } = await axios.post(
        `https://open-api.openocean.finance/v1/${chain.chainId}/dca/cancel`,
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
            chainId: chain.chainId,
            mode: 'Dca' // Specify DCA mode
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
   * Fetch user's DCA orders from OpenOcean API
   */
  const getLimitOrder = async (account) => {
    let url = `https://open-api.openocean.finance/v1/${chain.chainId}/dca/address/${walletAccount || account}?page=1&limit=100&statuses=[1,2,5]&sortBy=createDateTime&exclude=0`
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
      <h1>Dca</h1>
      <div className="page-content">
        <p>Create and manage dca for {inToken.symbol}/{outToken.symbol} trading pair on Base network.</p>

        {/* Wallet Connection Section */}
        <div className="wallet-section">
          {!isWalletConnected ? (
            <div className="wallet-notice">
              <p>⚠️ Please connect your MetaMask wallet to use Dca functionality</p>
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

        {/* DCA Form */}
        <div className="limit-order-form">
          <div>
            <span>
              Trading Pair  <i style={{ fontSize: '0.8rem', color: 'red' }}>{chain.chainName}</i>
            </span>
            <span>{inToken.symbol}/{outToken.symbol}</span>
          </div>

          {/* Total Allocation Input */}
          <div className="form-group">
            <label htmlFor="makerAmount">
              <span>Total allocation ({inToken.symbol})</span>
              <i style={{ fontSize: '0.8rem', color: 'red' }}> less than $5</i>
            </label>
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

          {/* Trade Interval and Frequency Settings */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', marginTop: '10px' }}>
            <div className="form-group" style={{ width: '50%' }}>
              <label htmlFor="time">Trade interval</label>
              <div style={{ display: 'flex', flexDirection: 'row' }}>
                <input
                  id="time"
                  type="number"
                  placeholder="Enter trade interval"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={!isWalletConnected}
                  style={{ width: '60%' }}
                />
                <select
                  id=""
                  value={everyUnit}
                  onChange={(e) => setEveryUnit(e.target.value)}
                  disabled={!isWalletConnected}
                  style={{ width: '60%' }}
                >
                  {everyUnitOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ width: '50%' }}>
              <label htmlFor="frequency">Frequency</label>
              <input
                id="frequency"
                type="number"
                placeholder="Enter frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                disabled={!isWalletConnected}
                min="1"
                step="1"
              />
            </div>
          </div>

          {/* Price Limit Settings (Optional) */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', marginTop: '10px' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
              Set limit price
              <i style={{ fontSize: '0.8rem', color: 'red', marginLeft: '6px' }}>optional</i>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', marginTop: '6px' }}>
            <div className="form-group" style={{ width: '50%' }}>
              <input
                id="min price"
                type="number"
                placeholder="Enter min price"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                disabled={!isWalletConnected}
                min="0"
                step="1"
              />
            </div>
            <div className="form-group" style={{ width: '50%' }}>
              <input
                id="max price"
                type="number"
                placeholder="Enter max price"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                disabled={!isWalletConnected}
                min="0"
                step="1"
              />
            </div>
          </div>

          {/* Price Limit Explanation */}
          <div style={{ fontSize: '0.8rem', color: 'red', marginTop: '10px', textAlign: 'left' }}>
            This is the upper and lower price range in USD of the buy token. Trades outside these limits will not be executed. The function only works for sell token is stablecoins, such as USDC.
          </div>

          {/* Create DCA Button */}
          <button
            className="limit-order-button"
            onClick={createLimitOrder}
            disabled={!isWalletConnected || !makerAmount || isLoading}
          >
            {isLoading ? 'Creating...' :
              !isWalletConnected ? 'Connect Wallet to Create Order' :
                !makerAmount ? 'Enter Price and Amount' : 'Create DCA'}
          </button>
        </div>

        {/* DCA Orders List Section */}
        <div className="orders-section">
          <h3>Your Orders</h3>
          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
              <p>No orders found</p>
              <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>Create your first DCA above</p>
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
                    <strong>Trade interval</strong><br />
                    {order.time}
                  </div>
                  <div className="order-amount">
                    <strong>Frequency</strong><br />
                    {order.frequency}
                  </div>
                  <div className="order-amount">
                    <strong>Min price</strong><br />
                    {order.minPrice}
                  </div>
                  <div className="order-amount">
                    <strong>Max price</strong><br />
                    {order.maxPrice}
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