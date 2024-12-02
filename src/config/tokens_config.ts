export const TOKENS = {
    SOL: {
      address: null,
      decimals: 9,
      symbol: 'SOL',
      name: 'Solana',
    },
    USDC: {
      address: 'someUsdcMintAddress1234567890ABCDEF', // Пример mint для USDC
      decimals: 6,
      symbol: 'USDC',
      name: 'USD Coin',
    },
  };
  

// Получение информации о токене
export function getTokenConfig(tokenSymbol: keyof typeof TOKENS) {
  const tokenConfig = TOKENS[tokenSymbol];
  if (!tokenConfig) {
    throw new Error(`Token configuration for ${tokenSymbol} not found.`);
  }
  return tokenConfig;
}
