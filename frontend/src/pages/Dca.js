import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import {
  supportedChains,
  switchToSupportedChain,
  getCurrentChainId,
  isChainSupported
} from '../utils/chainUtils';
import './Pages.css';

/**
 * DCA (Dollar Cost Averaging) Component
 * Handles DCA strategy creation and management
 * Allows users to create automated recurring buy orders for token accumulation
 */
const Dca = () => {
  // API base URL
  const baseUrl = 'https://open-api.openocean.finance';

  // Supported chains for DCA functionality
  const dcaChains = ["eth", "bsc", "base", "sonic", "bera", "arbitrum", "hyperevm", "avax"];

  // Wallet connection state
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAccount, setWalletAccount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState(null);
  const [currentChainId, setCurrentChainId] = useState(null);

  // DCA strategy parameters
  const [makerAmount, setMakerAmount] = useState(20); // Total allocation amount
  const [everyUnit, setEveryUnit] = useState(60 * 60); // Time unit in seconds
  const [time, setTime] = useState(1); // Time interval value
  const [frequency, setFrequency] = useState(2); // Number of trades to execute
  const [minPrice, setMinPrice] = useState(null); // Minimum price limit (optional)
  const [maxPrice, setMaxPrice] = useState(null); // Maximum price limit (optional)

  // Orders list state
  const [orders, setOrders] = useState([]);

  // Chain configuration for Base network
  const chain = {
    chainId: 8453,
    chainName: 'base',
  };

  // Input token configuration (USDC)
  const inToken = {
    "address": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    "decimals": 6,
    "symbol": "USDC",
  };

  // Output token configuration (USDT)
  const outToken = {
    "address": "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2",
    "decimals": 6,
    "symbol": "USDT"
  };

  // Available time unit options for DCA intervals
  const everyUnitOptions = [
    { value: 60, label: "Minute" },
    { value: 60 * 60, label: "Hour" },
    { value: 60 * 60 * 24, label: "Day" },
    { value: 60 * 60 * 24 * 7, label: "Week" },
    { value: 60 * 60 * 24 * 30, label: "Month" }
  ];

  // ERC20 token ABI for allowance and approval functions
  const ERC20Abi = [
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)"
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

      // Request account access
      await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      // Get current chain ID
      const chainId = await getCurrentChainId();
      setCurrentChainId(chainId);

      // Check if current chain is supported and prompt for switching
      if (chainId !== chain.chainId) {
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
          // Update chain ID after successful switch
          const newChainId = await getCurrentChainId();
          setCurrentChainId(newChainId);
        } else {
          setIsLoading(false);
          return;
        }
      }

      // Create provider and get signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      // Update state
      setProvider(provider);
      setWalletAccount(address);
      setIsWalletConnected(true);
      
      // Fetch existing orders
      await getDcaOrders(address);

      console.log('Wallet connected:', address, 'on chain:', chainId);

      // Set up event listeners for wallet changes
      setupWalletEventListeners();
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Set up event listeners for wallet account and chain changes
   */
  const setupWalletEventListeners = () => {
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
  };

  /**
   * Disconnect wallet and reset state
   */
  const disconnectWallet = () => {
    setWalletAccount('');
    setIsWalletConnected(false);
    setCurrentChainId(null);
    setProvider(null);
    setOrders([]);
    console.log('Wallet disconnected');
  };

  /**
   * Create a new DCA strategy
   * Handles DCA creation using OpenOcean API
   */
  const createDcaOrder = async () => {
    if (!isWalletConnected) {
      alert('Please connect your wallet first!');
      return;
    }

    if (!makerAmount || makerAmount <= 0) {
      alert('Please enter a valid amount!');
      return;
    }

    try {
      setIsLoading(true);

      if (!provider) {
        alert('Please connect wallet first');
        return;
      }

      // Contract address for DCA operations
      const contractAddress = '0x6cBB2598881940D08d5Ea3fA8F557E02996e1031';
      
      // Check and approve token if needed (for non-native tokens)
      if (!isNativeToken(inToken.address)) {
        const approvalAmount = makerAmount * (10 ** inToken.decimals);
        await checkTokenApproval(inToken.address, contractAddress, approvalAmount, walletAccount, provider);
      }

      // Prepare DCA parameters
      const messageParams = {
        makerAsset: inToken.address,
        takerAsset: outToken.address,
        makerAmount: (makerAmount * (10 ** inToken.decimals)).toString(),
      };

      // Create message for signing
      const message = `makerAsset:\n${messageParams.makerAsset}\ntakerAsset:\n${messageParams.takerAsset}\nmakerAmount:\n${messageParams.makerAmount}`;
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);

      // Prepare order object
      const order = {
        ...messageParams,
        signature,
        orderMaker: walletAccount,
        minPrice: minPrice || 0,
        maxPrice: maxPrice || 0,
        time: everyUnit * time,
        times: frequency,
      };

      // Submit DCA order to OpenOcean API
      const { data } = await axios.post(
        `${baseUrl}/v2/${chain.chainId}/dca/swap`,
        order,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (data.code === 400) {
        alert('Failed to create DCA: ' + data.error);
        return;
      }

      // Refresh orders list
      await getDcaOrders();

      console.log('DCA order created:', data);
      alert('DCA order created successfully!');

      // Reset form
      setMakerAmount(20);
      setTime(1);
      setFrequency(2);
      setMinPrice(null);
      setMaxPrice(null);
    } catch (error) {
      console.error('Error creating DCA:', error);
      alert('Failed to create DCA: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cancel an existing DCA order
   * Handles order cancellation through OpenOcean API
   */
  const cancelOrder = async (order) => {
    try {
      const { orderHash } = order;

      // Create message for signing
      const message = 'orderHash:\n' + orderHash;
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);

      // Cancel order through API
      const { data } = await axios.post(
        `${baseUrl}/v2/${chain.chainId}/dca/cancel`,
        {
          orderHash,
          signature
        }
      );

      if (data.code !== 200) {
        throw new Error(data.error);
      }

      // Refresh orders list
      await getDcaOrders();
      alert('Order cancelled successfully!');
    } catch (error) {
      console.error('Error canceling order:', error);
      alert('Failed to cancel order: ' + error.message);
    }
  };

  /**
   * Fetch user's DCA orders from OpenOcean API
   * @param {string} account - Optional account address, defaults to connected wallet
   */
  const getDcaOrders = async (account = null) => {
    try {
      const targetAccount = account || walletAccount;
      if (!targetAccount) return;

      const url = `${baseUrl}/v2/${chain.chainId}/dca/address/${targetAccount}?page=1&limit=100&statuses=[1,2,5]&sortBy=createDateTime&exclude=0`;
      const response = await axios.get(url);
      setOrders(response.data.data || []);
    } catch (error) {
      console.error('Error fetching DCA orders:', error);
      setOrders([]);
    }
  };

  /**
   * Check if an address represents a native token (ETH, MATIC, etc.)
   * @param {string} address - The token address to check
   * @returns {boolean} - True if native token, false otherwise
   */
  const isNativeToken = (address) => {
    if (!address) return true;
    const addr = address.toLowerCase();
    return addr === "0x0000000000000000000000000000000000000000" ||
           addr === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
  };

  /**
   * Check if token approval is sufficient and approve if needed
   * @param {string} tokenAddress - The token contract address
   * @param {string} contractAddress - The spender contract address
   * @param {number} amount - The required approval amount
   * @param {string} account - The user's wallet address
   * @param {Object} provider - Ethers provider instance
   * @returns {Promise<boolean|Object>} - True if approval is sufficient, transaction object if approval is needed
   */
  const checkTokenApproval = async (
    tokenAddress,
    contractAddress,
    amount,
    account,
    provider
  ) => {
    try {
    // Get current token allowance
      const currentAllowance = await getTokenAllowance(tokenAddress, contractAddress, account, provider);

    // Check if current allowance is sufficient
      if (ethers.parseUnits(currentAllowance.toString(), 0) < ethers.parseUnits(amount.toString(), 0)) {
      // Current allowance is insufficient, approve maximum amount
      const maxAmount = ethers.MaxUint256;
        return await sendTokenApproval(
        tokenAddress,
        contractAddress,
        maxAmount,
        provider
      );
    }

    // Allowance is sufficient, no approval needed
    return true;
    } catch (error) {
      console.error('Error checking token approval:', error);
      throw new Error('Failed to check token approval: ' + error.message);
    }
  };

  /**
   * Get the current token allowance for a specific spender
   * @param {string} tokenAddress - The token contract address
   * @param {string} contractAddress - The spender contract address
   * @param {string} account - The owner's wallet address
   * @param {Object} provider - Ethers provider instance
   * @returns {Promise<BigInt>} - The current allowance amount
   */
  const getTokenAllowance = async (tokenAddress, contractAddress, account, provider) => {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20Abi, provider);
    return await tokenContract.allowance(account, contractAddress);
  };

  /**
   * Send token approval transaction to allow a contract to spend tokens
   * @param {string} tokenAddress - The token contract address
   * @param {string} contractAddress - The spender contract address
   * @param {BigInt} maxAmount - The maximum amount to approve
   * @param {Object} provider - Ethers provider instance
   * @returns {Promise<Object>} - The transaction object
   */
  const sendTokenApproval = async (
    tokenAddress,
    contractAddress,
    maxAmount,
    provider
  ) => {
    try {
    const signer = await provider.getSigner();
    const tokenContract = new ethers.Contract(tokenAddress, ERC20Abi, signer);

    // Send approval transaction
    const tx = await tokenContract.approve(contractAddress, maxAmount);

    // Wait for transaction confirmation
    await tx.wait();
      console.log('Token approval successful:', tx.hash);
    return tx;
    } catch (error) {
      console.error('Error sending token approval:', error);
      throw new Error('Failed to approve token: ' + error.message);
    }
  };

  /**
   * Format wallet address for display (truncated format)
   * @param {string} address - The wallet address to format
   * @returns {string} - Formatted address string
   */
  const formatAddress = (address) => {
    return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
  };

  /**
   * Format date string for display
   * @param {string} dateString - ISO date string
   * @returns {string} - Formatted date string
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  /**
   * Get human-readable status text for order status
   * @param {number} status - Order status code
   * @returns {string} - Status text
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
   * @param {number} status - Order status code
   * @returns {string} - CSS color value
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

  /**
   * Check if order can be cancelled
   * @param {number} status - Order status code
   * @returns {boolean} - True if order can be cancelled
   */
  const canCancelOrder = (status) => {
    return status !== 3 && status !== 4; // Can't cancel filled or cancelled orders
  };

  return (
    <div className="page">
      <h1>DCA (Dollar Cost Averaging)</h1>
      <div className="page-content">
        <p>Create and manage DCA strategies for {inToken.symbol}/{outToken.symbol} trading pair on Base network.</p>

        {/* Wallet Connection Section */}
        <div className="wallet-section">
          {!isWalletConnected ? (
            <div className="wallet-notice">
              <p>⚠️ Please connect your MetaMask wallet to use DCA functionality</p>
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

        {/* DCA Strategy Form */}
        <div className="dca-form">
          <div className="form-header">
            <span>Trading Pair</span>
            <span className="chain-indicator">
              <i className="chain-name">{chain.chainName}</i>
            </span>
            <span>{inToken.symbol}/{outToken.symbol}</span>
          </div>

          {/* Total Allocation Input */}
          <div className="form-group">
            <label htmlFor="makerAmount">
              <span>Total allocation ({inToken.symbol})</span>
              <i className="amount-limit"> less than $5</i>
            </label>
            <input
              id="makerAmount"
              type="number"
              placeholder="Enter total allocation amount"
              value={makerAmount}
              onChange={(e) => setMakerAmount(parseFloat(e.target.value) || 0)}
              disabled={!isWalletConnected}
              min="0"
              step="0.000001"
            />
          </div>

          {/* Trade Interval and Frequency Settings */}
          <div className="form-row">
            <div className="form-group form-group-half">
              <label htmlFor="time">Trade interval</label>
              <div className="interval-input-group">
                <input
                  id="time"
                  type="number"
                  placeholder="Enter interval value"
                  value={time}
                  onChange={(e) => setTime(parseInt(e.target.value) || 1)}
                  disabled={!isWalletConnected}
                  min="1"
                  className="interval-value-input"
                />
                <select
                  value={everyUnit}
                  onChange={(e) => setEveryUnit(parseInt(e.target.value))}
                  disabled={!isWalletConnected}
                  className="interval-unit-select"
                >
                  {everyUnitOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group form-group-half">
              <label htmlFor="frequency">Number of trades</label>
              <input
                id="frequency"
                type="number"
                placeholder="Enter frequency"
                value={frequency}
                onChange={(e) => setFrequency(parseInt(e.target.value) || 1)}
                disabled={!isWalletConnected}
                min="1"
                step="1"
              />
            </div>
          </div>

          {/* Price Limit Settings (Optional) */}
          <div className="price-limit-section">
            <span className="section-title">
              Set limit price
              <i className="optional-label">optional</i>
            </span>
          </div>

          <div className="form-row">
            <div className="form-group form-group-half">
              <input
                id="minPrice"
                type="number"
                placeholder="Enter minimum price"
                value={minPrice || ''}
                onChange={(e) => setMinPrice(e.target.value ? parseFloat(e.target.value) : null)}
                disabled={!isWalletConnected}
                min="0"
                step="0.01"
              />
            </div>
            <div className="form-group form-group-half">
              <input
                id="maxPrice"
                type="number"
                placeholder="Enter maximum price"
                value={maxPrice || ''}
                onChange={(e) => setMaxPrice(e.target.value ? parseFloat(e.target.value) : null)}
                disabled={!isWalletConnected}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Price Limit Explanation */}
          <div className="price-limit-explanation">
            <p>
              This sets the upper and lower price range in USD for the buy token. 
              Trades outside these limits will not be executed. 
              This function only works when the sell token is a stablecoin (e.g., USDC).
            </p>
          </div>

          {/* Create DCA Button */}
          <button
            className="dca-button"
            onClick={createDcaOrder}
            disabled={!isWalletConnected || !makerAmount || isLoading}
          >
            {isLoading ? 'Creating...' :
              !isWalletConnected ? 'Connect Wallet to Create Order' :
                !makerAmount ? 'Enter Amount' : 'Create DCA Strategy'}
          </button>
        </div>

        {/* DCA Orders List Section */}
        <div className="orders-section">
          <h3>Your DCA Orders</h3>
          {orders.length === 0 ? (
            <div className="no-orders">
              <p>No DCA orders found</p>
              <p className="no-orders-hint">Create your first DCA strategy above</p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="order-item">
                <div className="order-info">
                  <div className="order-field">
                    <strong>Created</strong><br />
                    {formatDate(order.createDateTime)}
                  </div>
                  <div className="order-field">
                    <strong>Amount</strong><br />
                    {(order.makerAmount / 10 ** inToken.decimals).toFixed(6)} {inToken.symbol}
                  </div>
                  <div className="order-field">
                    <strong>Interval</strong><br />
                    {order.time} seconds
                  </div>
                  <div className="order-field">
                    <strong>Frequency</strong><br />
                    {order.times} trades
                  </div>
                  <div className="order-field">
                    <strong>Min Price</strong><br />
                    {order.minPrice || 'No limit'}
                  </div>
                  <div className="order-field">
                    <strong>Max Price</strong><br />
                    {order.maxPrice || 'No limit'}
                  </div>
                  <div className="order-field">
                    <strong>Status</strong><br />
                    <span style={{ color: getStatusColor(order.statuses) }}>
                    {getStatusText(order.statuses)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => cancelOrder(order)}
                  className="cancel-button"
                  disabled={!canCancelOrder(order.statuses)}
                >
                  {canCancelOrder(order.statuses) ? 'Cancel' : 'Completed'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dca; 