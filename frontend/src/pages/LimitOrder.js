import React, { useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { supportedChains } from '../utils/chainUtils';
import {
  CONSTANTS,
  CHAIN_CONFIG,
  TOKEN_CONFIG,
  EXPIRE_TIME_OPTIONS,
  ERC20_ABI,
  utils
} from '../utils/limitOrderUtils';
import { useWalletConnection } from '../hooks/useWalletConnection';
import './Pages.css';

// Token approval related functions
const tokenApproval = {
  async checkTokenApproval (tokenAddress, contractAddress, amount, account, provider) {
    try {
      const currentAllowance = await this.getTokenAllowance(tokenAddress, contractAddress, account, provider);

      if (ethers.parseUnits(currentAllowance.toString(), 0) < ethers.parseUnits(amount.toString(), 0)) {
        const maxAmount = ethers.MaxUint256;
        return await this.sendTokenApproval(tokenAddress, contractAddress, maxAmount, provider);
      }
      return true;
    } catch (error) {
      console.error('Error checking token approval:', error);
      throw new Error('Failed to check token approval: ' + error.message);
    }
  },

  async getTokenAllowance (tokenAddress, contractAddress, account, provider) {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    return await tokenContract.allowance(account, contractAddress);
  },

  async sendTokenApproval (tokenAddress, contractAddress, maxAmount, provider) {
    try {
      const signer = await provider.getSigner();
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      const tx = await tokenContract.approve(contractAddress, maxAmount);
      await tx.wait();
      console.log('Token approval successful:', tx.hash);
      return tx;
    } catch (error) {
      console.error('Error sending token approval:', error);
      throw new Error('Failed to approve token: ' + error.message);
    }
  }
};

// Sub-component: Wallet connection section
const WalletSection = ({ isWalletConnected, walletAccount, currentChainId, isLoading, onConnect, onDisconnect }) => (
  <div className="wallet-section">
    {!isWalletConnected ? (
      <div className="wallet-notice">
        <p>⚠️ Please connect your MetaMask wallet to use Limit Order functionality</p>
        <button
          className="connect-button"
          onClick={onConnect}
          disabled={isLoading}
        >
          {isLoading ? 'Connecting...' : 'Connect MetaMask'}
        </button>
      </div>
    ) : (
      <div className="wallet-status">
        <p>✅ Connected: {utils.formatAddress(walletAccount)}</p>
        <p>🌐 Chain: {supportedChains[currentChainId]?.name || `Chain ${currentChainId}`}</p>
        <button className="disconnect-button" onClick={onDisconnect}>
          Disconnect
        </button>
      </div>
    )}
  </div>
);

// Sub-component: Limit order form
const LimitOrderForm = ({
  makerAmount,
  takerAmount,
  expireTime,
  isWalletConnected,
  isLoading,
  onMakerAmountChange,
  onTakerAmountChange,
  onExpireTimeChange,
  onSubmit
}) => (
  <div className="limit-order-form">
    <div className="form-header">
      <span>Trading Pair</span>
      <span className="chain-indicator">
        <i className="chain-name">{CHAIN_CONFIG.chainName}</i>
      </span>
      <span>{TOKEN_CONFIG.inToken.symbol}/{TOKEN_CONFIG.outToken.symbol}</span>
    </div>

    <div className="form-row">
      <div className="form-group form-group-half">
        <label htmlFor="makerAmount">Maker Amount ({TOKEN_CONFIG.inToken.symbol})</label>
        <input
          id="makerAmount"
          type="number"
          placeholder="Enter maker amount"
          value={makerAmount}
          onChange={onMakerAmountChange}
          disabled={!isWalletConnected}
          min="0"
          step="0.000001"
        />
      </div>

      <div className="form-group form-group-half">
        <label htmlFor="takerAmount">Taker Amount ({TOKEN_CONFIG.outToken.symbol})</label>
        <input
          id="takerAmount"
          type="number"
          placeholder="Enter taker amount"
          value={takerAmount}
          onChange={onTakerAmountChange}
          disabled={!isWalletConnected}
          min="0"
          step="0.000001"
        />
      </div>
    </div>

    <div className="form-group">
      <label htmlFor="expireTime">Time in Force</label>
      <select
        id="expireTime"
        value={expireTime}
        onChange={onExpireTimeChange}
        disabled={!isWalletConnected}
      >
        {EXPIRE_TIME_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>

    <button
      className="limit-order-button"
      onClick={onSubmit}
      disabled={!isWalletConnected || !takerAmount || !makerAmount || isLoading}
    >
      {isLoading ? 'Creating...' :
        !isWalletConnected ? 'Connect Wallet to Create Order' :
          !takerAmount || !makerAmount ? 'Enter Price and Amount' : 'Create Limit Order'}
    </button>
  </div>
);

// Sub-component: Order item
const OrderItem = ({ order, inToken, outToken, onCancel }) => (
  <div className="order-item">
    <div className="order-info">
      <div className="order-field">
        <strong>Created</strong><br />
        {utils.formatDate(order.createDateTime)}
      </div>
      <div className="order-field">
        <strong>Maker</strong><br />
        {(order.makerAmount / 10 ** inToken.decimals).toFixed(6)} {inToken.symbol}
      </div>
      <div className="order-field">
        <strong>Taker</strong><br />
        {(order.takerAmount / 10 ** outToken.decimals).toFixed(6)} {outToken.symbol}
      </div>
      <div className="order-field">
        <strong>Price</strong><br />
        {utils.calculatePriceRatio(
          order.takerAmount,
          order.makerAmount,
          outToken.decimals,
          inToken.decimals
        ).toFixed(6)}
      </div>
      <div className="order-field">
        <strong>Status</strong><br />
        <span style={{ color: utils.getStatusColor(order.statuses) }}>
          {utils.getStatusText(order.statuses)}
        </span>
      </div>
    </div>
    <button
      onClick={() => onCancel(order)}
      className="cancel-button"
      disabled={!utils.canCancelOrder(order.statuses)}
    >
      {utils.canCancelOrder(order.statuses) ? 'Cancel' : 'Completed'}
    </button>
  </div>
);

// Sub-component: Orders list
const OrdersList = ({ orders, inToken, outToken, onCancel }) => (
  <div className="orders-section">
    <h3>Your Orders</h3>
    {orders.length === 0 ? (
      <div className="no-orders">
        <p>No orders found</p>
        <p className="no-orders-hint">Create your first limit order above</p>
      </div>
    ) : (
      orders.map((order) => (
        <OrderItem
          key={order.id}
          order={order}
          inToken={inToken}
          outToken={outToken}
          onCancel={onCancel}
        />
      ))
    )}
  </div>
);

// Main component
const LimitOrder = () => {
  const {
    state,
    dispatch,
    checkWalletConnection,
    connectWallet,
    disconnectWallet,
    setupWalletEventListeners
  } = useWalletConnection();

  // Initialize component
  useEffect(() => {
    checkWalletConnection();
  }, [checkWalletConnection]);

  // Setup wallet event listeners
  useEffect(() => {
    if (state.isWalletConnected) {
      setupWalletEventListeners();
    }
  }, [state.isWalletConnected, setupWalletEventListeners]);

  // Handle form value changes
  const handleMakerAmountChange = useCallback((e) => {
    dispatch({
      type: 'SET_FORM_VALUES',
      payload: { makerAmount: parseFloat(e.target.value) || 0 }
    });
  }, [dispatch]);

  const handleTakerAmountChange = useCallback((e) => {
    dispatch({
      type: 'SET_FORM_VALUES',
      payload: { takerAmount: parseFloat(e.target.value) || 0 }
    });
  }, [dispatch]);

  const handleExpireTimeChange = useCallback((e) => {
    dispatch({
      type: 'SET_FORM_VALUES',
      payload: { expireTime: parseInt(e.target.value) }
    });
  }, [dispatch]);

  // Fetch limit orders list
  const getLimitOrders = useCallback(async (account = null) => {
    try {
      const targetAccount = account || state.walletAccount;
      if (!targetAccount) return;

      const url = `${CONSTANTS.API_BASE_URL}/v2/${CHAIN_CONFIG.chainId}/limit-order/address/${targetAccount}?page=1&limit=100&statuses=[1,2,5]&sortBy=createDateTime&exclude=0`;
      const response = await axios.get(url);
      dispatch({ type: 'SET_ORDERS', payload: response.data.data || [] });
    } catch (error) {
      console.error('Error fetching limit orders:', error);
      dispatch({ type: 'SET_ORDERS', payload: [] });
    }
  }, [state.walletAccount, dispatch]);

  // Create limit order
  const createLimitOrder = useCallback(async () => {
    if (!state.isWalletConnected) {
      alert('Please connect your wallet first!');
      return;
    }

    if (!state.makerAmount || !state.takerAmount || state.makerAmount <= 0 || state.takerAmount <= 0) {
      alert('Please enter valid price and amount!');
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      if (!state.provider) {
        alert('Please connect wallet first');
        return;
      }

      const contractAddress = utils.getLimitContractAddress(CHAIN_CONFIG.chainName);

      if (!utils.isNativeToken(TOKEN_CONFIG.inToken.address)) {
        const approvalAmount = state.makerAmount * (10 ** TOKEN_CONFIG.inToken.decimals);
        await tokenApproval.checkTokenApproval(
          TOKEN_CONFIG.inToken.address,
          contractAddress,
          approvalAmount,
          state.walletAccount,
          state.provider
        );
      }

      const messageParams = {
        makerAsset: TOKEN_CONFIG.inToken.address,
        takerAsset: TOKEN_CONFIG.outToken.address,
        makerAmount: (state.makerAmount * (10 ** TOKEN_CONFIG.inToken.decimals)).toString(),
        takerAmount: (state.takerAmount * (10 ** TOKEN_CONFIG.outToken.decimals)).toString(),
        expireTime: state.expireTime,
      };

      const message = `makerAsset:\n${messageParams.makerAsset}\ntakerAsset:\n${messageParams.takerAsset}\nmakerAmount:\n${messageParams.makerAmount}\ntakerAmount:\n${messageParams.takerAmount}\nexpireTime:\n${messageParams.expireTime}`;
      const signer = await state.provider.getSigner();
      const signature = await signer.signMessage(message);

      const order = {
        ...messageParams,
        signature,
        orderMaker: state.walletAccount,
      };

      await axios.post(
        `${CONSTANTS.API_BASE_URL}/v2/${CHAIN_CONFIG.chainId}/limit-order`,
        order,
        { headers: { 'Content-Type': 'application/json' } }
      );

      await getLimitOrders();
      console.log('Limit order created successfully!');
      alert('Limit order created successfully!');
      dispatch({ type: 'RESET_FORM' });
    } catch (error) {
      console.error('Error creating limit order:', error);
      alert('Failed to create limit order: ' + error.message);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state, dispatch, getLimitOrders]);

  // Cancel order
  const cancelOrder = useCallback(async (order) => {
    try {
      const { orderHash } = order;
      const message = 'orderHash:\n' + orderHash;
      const signer = await state.provider.getSigner();
      const signature = await signer.signMessage(message);

      await axios.post(
        `${CONSTANTS.API_BASE_URL}/v2/${CHAIN_CONFIG.chainId}/limit-order/cancelLimitOrder`,
        { orderHash, signature }
      );

      console.log('Order cancelled successfully!');
      await getLimitOrders();
      alert('Order cancelled successfully!');
    } catch (error) {
      console.error('Error canceling order:', error);
      alert('Failed to cancel order: ' + error.message);
    }
  }, [state.provider, getLimitOrders]);

  // Computed properties
  const isFormValid = useMemo(() => {
    return state.isWalletConnected && state.takerAmount > 0 && state.makerAmount > 0;
  }, [state.isWalletConnected, state.takerAmount, state.makerAmount]);

  return (
    <div className="page">
      <h1>Limit Order</h1>
      <div className="page-content">
        <p>Create and manage limit orders for {TOKEN_CONFIG.inToken.symbol}/{TOKEN_CONFIG.outToken.symbol} trading pair on Base network.</p>

        <WalletSection
          isWalletConnected={state.isWalletConnected}
          walletAccount={state.walletAccount}
          currentChainId={state.currentChainId}
          isLoading={state.isLoading}
          onConnect={connectWallet}
          onDisconnect={disconnectWallet}
        />

        <LimitOrderForm
          makerAmount={state.makerAmount}
          takerAmount={state.takerAmount}
          expireTime={state.expireTime}
          isWalletConnected={state.isWalletConnected}
          isLoading={state.isLoading}
          onMakerAmountChange={handleMakerAmountChange}
          onTakerAmountChange={handleTakerAmountChange}
          onExpireTimeChange={handleExpireTimeChange}
          onSubmit={createLimitOrder}
        />

        <OrdersList
          orders={state.orders}
          inToken={TOKEN_CONFIG.inToken}
          outToken={TOKEN_CONFIG.outToken}
          onCancel={cancelOrder}
        />
      </div>
    </div>
  );
};

export default LimitOrder; 