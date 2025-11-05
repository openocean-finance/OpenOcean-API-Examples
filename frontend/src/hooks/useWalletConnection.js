import { useReducer, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  switchToSupportedChain,
  getCurrentChainId,
  isChainSupported,
} from '../utils/chainUtils';
import { CHAIN_CONFIG, initialState, reducer } from '../utils/limitOrderUtils';

// Custom Hook: Wallet connection
export function useWalletConnection() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const checkWalletConnection = useCallback(async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          await connectWallet();
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
        dispatch({ type: 'SET_ERROR', payload: error.message });
      }
    }
  }, []);

  const connectWallet = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('Please install MetaMask!');
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chainId = await getCurrentChainId();

      if (chainId !== CHAIN_CONFIG.chainId) {
        const shouldSwitch = window.confirm(
          `Current chain (${chainId}) is not supported. Would you like to switch to Base?`
        );

        if (shouldSwitch) {
          const switched = await switchToSupportedChain(CHAIN_CONFIG.chainId);
          if (!switched) {
            throw new Error('Failed to switch to supported chain. Please switch manually.');
          }
          const newChainId = await getCurrentChainId();
          dispatch({ type: 'SET_WALLET_CONNECTION', payload: { currentChainId: newChainId } });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }
      } else {
        dispatch({ type: 'SET_WALLET_CONNECTION', payload: { currentChainId: chainId } });
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      dispatch({
        type: 'SET_WALLET_CONNECTION',
        payload: {
          provider,
          walletAccount: address,
          isWalletConnected: true
        }
      });

      console.log('Wallet connected:', address, 'on chain:', chainId);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      alert('Failed to connect wallet: ' + error.message);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    dispatch({ type: 'DISCONNECT_WALLET' });
    console.log('Wallet disconnected');
  }, []);

  const setupWalletEventListeners = useCallback(() => {
    window.ethereum.on('accountsChanged', (newAccounts) => {
      if (newAccounts.length > 0) {
        connectWallet();
      } else {
        disconnectWallet();
      }
    });

    window.ethereum.on('chainChanged', (chainId) => {
      const newChainId = parseInt(chainId, 16);
      dispatch({ type: 'SET_WALLET_CONNECTION', payload: { currentChainId: newChainId } });

      if (!isChainSupported(newChainId)) {
        alert(`Chain ${newChainId} is not supported. Please switch to a supported chain.`);
        dispatch({ type: 'SET_WALLET_CONNECTION', payload: { isWalletConnected: false } });
      }
    });
  }, [connectWallet, disconnectWallet]);

  return {
    state,
    dispatch,
    checkWalletConnection,
    connectWallet,
    disconnectWallet,
    setupWalletEventListeners
  };
} 