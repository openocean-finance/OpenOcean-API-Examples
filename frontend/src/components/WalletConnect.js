import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import './WalletConnect.css';

const WalletConnect = ({ onWalletConnect, onWalletDisconnect }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        debugger
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          await connectWallet(accounts[0]);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  };

  const connectWallet = async (accountAddress = null) => {
    setIsLoading(true);
    try {
      if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask!');
        return;
      }

      let accounts;
      if (accountAddress) {
        accounts = [accountAddress];
      } else {
        accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
      }

      if (accounts.length > 0) {
        const web3 = new Web3(window.ethereum);
        const balance = await web3.eth.getBalance(accounts[0]);
        const ethBalance = web3.utils.fromWei(balance, 'ether');

        setAccount(accounts[0]);
        setBalance(parseFloat(ethBalance).toFixed(4));
        setIsConnected(true);
        
        if (onWalletConnect) {
          onWalletConnect(accounts[0], web3);
        }

        // Listen for account changes
        window.ethereum.on('accountsChanged', (newAccounts) => {
          if (newAccounts.length > 0) {
            connectWallet(newAccounts[0]);
          } else {
            disconnectWallet();
          }
        });

        // Listen for chain changes
        window.ethereum.on('chainChanged', () => {
          window.location.reload();
        });
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount('');
    setBalance('');
    setIsConnected(false);
    
    if (onWalletDisconnect) {
      onWalletDisconnect();
    }
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="wallet-connect">
      {!isConnected ? (
        <button 
          className="connect-button"
          onClick={() => connectWallet()}
          disabled={isLoading}
        >
          {isLoading ? 'Connecting...' : 'Connect MetaMask'}
        </button>
      ) : (
        <div className="wallet-info">
          <div className="account-info">
            <span className="account-address">{formatAddress(account)}</span>
            <span className="balance">{balance} ETH</span>
          </div>
          <button 
            className="disconnect-button"
            onClick={disconnectWallet}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletConnect; 