export const TOKENS = {
  SOL: {
    address: null,
    decimals: 9, // Number of decimal places for SOL
    symbol: 'SOL',
    name: 'Solana',
  },
};

// Getting information about a token
export function getTokenConfig(tokenSymbol: keyof typeof TOKENS) {
  const tokenConfig = TOKENS[tokenSymbol];
  if (!tokenConfig) {
    throw new Error(`Token configuration for ${tokenSymbol} not found.`);
  }
  return tokenConfig;
}
