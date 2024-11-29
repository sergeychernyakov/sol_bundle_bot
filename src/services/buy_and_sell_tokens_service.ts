import { buy_tokens } from "./buy_tokens";
import { sell_tokens_service } from "./sell_tokens_service";

/**
 * Combined token buying and selling functionality
 */
export async function buy_and_sell_tokens_service() {
  try {
    await buy_tokens();
    await sell_tokens_service();
  } catch (error) {
    console.error(error);
  }
}