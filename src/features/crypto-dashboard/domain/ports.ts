import type { CoinMeta } from "./types";

export interface CryptoDashboardPort {
  getCoins(): Promise<readonly CoinMeta[]>;
}
