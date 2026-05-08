import type { CoinMeta } from "../../domain/types";
import type { CryptoDashboardPort } from "../../domain/ports";
import type { HttpClient } from "../../../../shared/lib/http/http-client";

export class HttpCryptoDashboardRepository implements CryptoDashboardPort {
  constructor(private readonly http: HttpClient) {}

  async getCoins(): Promise<readonly CoinMeta[]> {
    return this.http.get<readonly CoinMeta[]>("/api/samples/crypto-dashboard");
  }
}
