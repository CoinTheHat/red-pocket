// DEPLOYED ON BASE MAINNET
export const RED_PACKET_ADDRESS = "0x15b6F4E8d9E1Eb506526392a66b02be6B65Cf62a";

export const TOKENS = [
    { symbol: "ETH", address: "0x0000000000000000000000000000000000000000", decimals: 18, name: "Ethereum" },
    { symbol: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6, name: "USD Coin" }, // Base Mainnet USDC
    { symbol: "USDT", address: "0x0000000000000000000000000000000000000000", decimals: 6, name: "Tether USD" } // Placeholder
];

// Backwards compatibility if needed, or use TOKENS[1].address
export const USDC_ADDRESS = TOKENS[1].address;

export const CHAIN_ID = 8453; // Base Mainnet
