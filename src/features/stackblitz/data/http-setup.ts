import type { MockHttpClient } from "../../../shared/lib/http/http-client";
import { PLAYGROUND_TEMPLATES } from "./data";

export function registerStackBlitzEndpoints(client: MockHttpClient): void {
  client.register("/api/stackblitz/templates", () => PLAYGROUND_TEMPLATES);
}
