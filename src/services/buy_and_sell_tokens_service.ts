import { BuyTokensService } from './buy_tokens_service';
import { SellTokensService } from './sell_tokens_service';
import { TOKENS } from '../config/tokens_config';

type TokenSymbol = keyof typeof TOKENS;

export class BuyAndSellTokensService {
  private buyService: BuyTokensService;
  private sellService: SellTokensService;

  constructor() {
    this.buyService = new BuyTokensService();
    this.sellService = new SellTokensService();
  }

  async buyAndSellTokens(
    buyTokenAddress: string,
    buyAmount: number,
    sellTokenAddress: string,
    sellAmount: number
  ): Promise<void> {
    const buyToken = this.validateToken(buyTokenAddress);
    const sellToken = this.validateToken(sellTokenAddress);

    await this.buyService.buyTokens(buyToken, buyAmount);
    await this.sellService.sellTokens(sellToken, sellAmount);
  }

  private validateToken(token: string): TokenSymbol {
    if (!(token in TOKENS)) {
      throw new Error(`Invalid token: ${token}`);
    }
    return token as TokenSymbol;
  }
}
