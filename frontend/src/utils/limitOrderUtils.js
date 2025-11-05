// Limit order related utility functions and constants

// Constants configuration
export const CONSTANTS = {
  API_BASE_URL: 'https://open-api.openocean.finance',
  DEFAULT_MAKER_AMOUNT: 0.01,
  DEFAULT_TAKER_AMOUNT: 0.02,
  DEFAULT_EXPIRE_TIME: 60 * 60 * 24 * 1000, // 1 day
  GAS_PRICE_BUFFER: 1.2,
  NATIVE_TOKEN_ADDRESSES: [
    "0x0000000000000000000000000000000000000000",
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
  ]
};

// Supported chains list
export const SUPPORTED_CHAINS = [
  "bsc", "eth", "polygon", "avax", "fantom", "arbitrum", "optimism",
  "moonriver", "harmony", "heco", "okex", "xdai", "cronos", "zksync", 
  "linea", "base", "sonic", "bera", "sei"
];

// Chain configuration
export const CHAIN_CONFIG = {
  chainId: 8453,
  chainName: 'base',
};

// Token configuration
export const TOKEN_CONFIG = {
  inToken: {
    address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    decimals: 6,
    symbol: "USDC",
  },
  outToken: {
    address: "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2",
    decimals: 6,
    symbol: "USDT"
  }
};

// Expiration time options
export const EXPIRE_TIME_OPTIONS = [
  { value: 10 * 60 * 1000, label: "10 Minutes" },
  { value: 60 * 60 * 1000, label: "1 Hour" },
  { value: 60 * 60 * 24 * 1000, label: "1 Day" },
  { value: 60 * 60 * 24 * 3 * 1000, label: "3 Days" },
  { value: 60 * 60 * 24 * 7 * 1000, label: "7 Days" },
  { value: 60 * 60 * 24 * 30 * 1000, label: "1 Month" },
  { value: 60 * 60 * 24 * 30 * 3 * 1000, label: "3 Months" },
  { value: 60 * 60 * 24 * 30 * 6 * 1000, label: "6 Months" },
  { value: 60 * 60 * 24 * 30 * 12 * 1000, label: "1 Year" }
];

// ERC20 token ABI
export const ERC20_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

// Contract address mapping
export const CONTRACT_ADDRESSES = {
  eth: "0xcC8d695603ce0b43D352891892FcC716c6a7C9f4",
  bsc: "0xA8A0213bb2ce671E457Ec14D08EB9d40E6DA8e2d",
  avax: "0x99b3488Ee3432bB60256140b4BD2488E3b6A705f",
  fantom: "0x44A632dC8ee03ad2cF5d530280a044DaED3E1ec0",
  polygon: "0xFA9B584Bc9543B66BeFdc41fb1DA8636edD7a697",
  arbitrum: "0x23C78B3d85b45BfA6DC8e09b517ba2d9b0ECCA8C",
  optimism: "0xc0A62DDCd284020dC883C642A3Ed5D2A1770eb91",
  moonriver: "0xc0A62DDCd284020dC883C642A3Ed5D2A1770eb91",
  harmony: "0xc0A62DDCd284020dC883C642A3Ed5D2A1770eb91",
  heco: "0xc0A62DDCd284020dC883C642A3Ed5D2A1770eb91",
  okex: "0xc0A62DDCd284020dC883C642A3Ed5D2A1770eb91",
  xdai: "0xc0A62DDCd284020dC883C642A3Ed5D2A1770eb91",
  cronos: "0xc0A62DDCd284020dC883C642A3Ed5D2A1770eb91",
  zksync: "0x6a9115a77598cb9897347a6c31E6a164Ea06F870",
  linea: "0x4045734fe21c7B7E0cE516BE009780Cc2BA39A8f",
  base: "0xb5486f71c902fe0844bb07221fa8f47834d90b1b",
  sonic: "0xb45373129b4220160b92bd2320869f44d48ecd01",
  bera: "0x8D2B7e5501Eb6D92F8e349f2FEbe785DD070bE74",
  sei: "0xfE9a934A8607EF020aDf22D4431d6cE6005Aa4d3",
  hyperevm: "0x4E6b18217AC75A779262c20B3Cc07050cBe7282B"
};

// Order status mapping
export const ORDER_STATUS = {
  PENDING: 1,
  ACTIVE: 2,
  FILLED: 3,
  CANCELLED: 4,
  EXPIRED: 5
};

export const STATUS_CONFIG = {
  [ORDER_STATUS.PENDING]: { text: 'Pending', color: '#ffc107' },
  [ORDER_STATUS.ACTIVE]: { text: 'Active', color: '#28a745' },
  [ORDER_STATUS.FILLED]: { text: 'Filled', color: '#007bff' },
  [ORDER_STATUS.CANCELLED]: { text: 'Cancelled', color: '#dc3545' },
  [ORDER_STATUS.EXPIRED]: { text: 'Expired', color: '#6c757d' }
};

// Utility functions
export const utils = {
  isNativeToken: (address) => {
    if (!address) return true;
    const addr = address.toLowerCase();
    return CONSTANTS.NATIVE_TOKEN_ADDRESSES.includes(addr);
  },

  formatAddress: (address) => {
    return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
  },

  formatDate: (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  },

  getStatusText: (status) => {
    return STATUS_CONFIG[status]?.text || 'Unknown';
  },

  getStatusColor: (status) => {
    return STATUS_CONFIG[status]?.color || '#6c757d';
  },

  canCancelOrder: (status) => {
    return status !== ORDER_STATUS.FILLED && status !== ORDER_STATUS.CANCELLED;
  },

  calculatePriceRatio: (takerAmount, makerAmount, takerDecimals, makerDecimals) => {
    const takerValue = takerAmount / (10 ** takerDecimals);
    const makerValue = makerAmount / (10 ** makerDecimals);
    return takerValue / makerValue;
  },

  getLimitContractAddress: (chainName) => {
    const contractAddress = CONTRACT_ADDRESSES[chainName];
    if (!contractAddress) {
      throw new Error(`Contract address not found for chain ${chainName}`);
    }
    return contractAddress;
  }
};

// State reducer
export const initialState = {
  isWalletConnected: false,
  walletAccount: '',
  isLoading: false,
  provider: null,
  currentChainId: null,
  makerAmount: CONSTANTS.DEFAULT_MAKER_AMOUNT,
  takerAmount: CONSTANTS.DEFAULT_TAKER_AMOUNT,
  expireTime: CONSTANTS.DEFAULT_EXPIRE_TIME,
  orders: [],
  error: null
};

export function reducer(state, action) {
  switch (action.type) {
    case 'SET_WALLET_CONNECTION':
      return { ...state, ...action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ORDERS':
      return { ...state, orders: action.payload };
    case 'SET_FORM_VALUES':
      return { ...state, ...action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET_FORM':
      return { 
        ...state, 
        makerAmount: CONSTANTS.DEFAULT_MAKER_AMOUNT,
        takerAmount: CONSTANTS.DEFAULT_TAKER_AMOUNT,
        expireTime: CONSTANTS.DEFAULT_EXPIRE_TIME
      };
    case 'DISCONNECT_WALLET':
      return {
        ...state,
        isWalletConnected: false,
        walletAccount: '',
        currentChainId: null,
        provider: null,
        orders: [],
        error: null
      };
    default:
      return state;
  }
} 