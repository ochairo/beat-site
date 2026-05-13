import type { MockHttpClient } from "../../../shared/lib/http/http-client";

import { COIN_META } from "./data";

export function registerCryptoDashboardEndpoints(client: MockHttpClient): void {
  client.register("/api/samples/crypto-dashboard", () => COIN_META);
}
