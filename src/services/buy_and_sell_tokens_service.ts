import { BuyTokensService } from './buy_tokens_service';
import { SellTokensService } from './sell_tokens_service';

export class BuyAndSellTokensService {
  private buyService: BuyTokensService;
  private sellService: SellTokensService;

  constructor() {
    this.buyService = new BuyTokensService();
    this.sellService = new SellTokensService();
  }

  async buyAndSellTokens(): Promise<void> {
    await this.buyService.buyTokens();
    await this.sellService.sellTokens();
  }
}
