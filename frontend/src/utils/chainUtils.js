
/**
 * Supported blockchain networks configuration
 * Maps chain ID to network information
 */
export const supportedChains = {
  1: { name: 'Ethereum Mainnet', symbol: 'ETH' },
  137: { name: 'Polygon', symbol: 'MATIC' },
  56: { name: 'BSC', symbol: 'BNB' },
  42161: { name: 'Arbitrum One', symbol: 'ETH' },
  10: { name: 'Optimism', symbol: 'ETH' },
  8453: { name: 'Base', symbol: 'ETH' }
};

/**
 * Chain configuration for MetaMask wallet integration
 * Contains RPC URLs, block explorer URLs, and native currency information
 */
export const chainConfigs = {
  1: {
    chainId: '0x1',
    chainName: 'Ethereum Mainnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.infura.io/v3/'],
    blockExplorerUrls: ['https://etherscan.io']
  },
  137: {
    chainId: '0x89',
    chainName: 'Polygon',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com']
  },
  56: {
    chainId: '0x38',
    chainName: 'BSC',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: ['https://bsc-dataseed.binance.org'],
    blockExplorerUrls: ['https://bscscan.com']
  },
  42161: {
    chainId: '0xa4b1',
    chainName: 'Arbitrum One',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://arbiscan.io']
  },
  10: {
    chainId: '0xa',
    chainName: 'Optimism',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.optimism.io'],
    blockExplorerUrls: ['https://optimistic.etherscan.io']
  },
  8453: {
    chainId: '0x2105',
    chainName: 'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org']
  }
};

/**
 * Switch to a supported blockchain network in MetaMask
 * @param {number} targetChainId - The target chain ID to switch to
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const switchToSupportedChain = async (targetChainId) => {
  try {
    // Attempt to switch to the target chain
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${targetChainId.toString(16)}` }],
    });
    return true;
  } catch (switchError) {
    // Error code 4902 indicates the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        const chainInfo = chainConfigs[targetChainId];
        if (!chainInfo) {
          console.error('Chain configuration not found for:', targetChainId);
          return false;
        }

        // Add the chain to MetaMask if it doesn't exist
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [chainInfo],
        });
        return true;
      } catch (addError) {
        console.error('Error adding chain:', addError);
        return false;
      }
    }
    console.error('Error switching chain:', switchError);
    return false;
  }
};

/**
 * Get the current connected chain ID from MetaMask
 * @returns {Promise<number|null>} - The current chain ID as a number, or null if error
 */
export const getCurrentChainId = async () => {
  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    return parseInt(chainId, 16);
  } catch (error) {
    console.error('Error getting current chain ID:', error);
    return null;
  }
};

/**
 * Check if a chain ID is supported by the application
 * @param {number} chainId - The chain ID to check
 * @returns {boolean} - True if supported, false otherwise
 */
export const isChainSupported = (chainId) => {
  return supportedChains.hasOwnProperty(chainId);
};

/**
 * Get chain information by chain ID
 * @param {number} chainId - The chain ID to get info for
 * @returns {Object|null} - Chain information object or null if not found
 */
export const getChainInfo = (chainId) => {
  return supportedChains[chainId] || null;
};
