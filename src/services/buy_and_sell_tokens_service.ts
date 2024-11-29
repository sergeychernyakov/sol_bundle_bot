import { buyBundle } from "./buy_tokens";
import { createWalletSells } from "./sell_tokens_service";

/**
 * Combined token buying and selling functionality
 */
export async function buyAndSellTokens() {
  try {
    await buyBundle();
    await createWalletSells();
  } catch (error) {
    console.error(error);
  }
}