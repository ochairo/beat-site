import type { MockHttpClient } from "../../../shared/lib/http/http-client";
import { HOME_FEATURES } from "./data";

export function registerHomeEndpoints(client: MockHttpClient): void {
  client.register("/api/home/features", () => HOME_FEATURES);
}
