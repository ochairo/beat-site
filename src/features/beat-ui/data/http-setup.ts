import type { MockHttpClient } from "../../../shared/lib/http/http-client";
import { NAV_GROUPS, SHOWCASES } from "./data";

export function registerBeatUIEndpoints(client: MockHttpClient): void {
  client.register("/api/beat-ui/nav-groups", () => NAV_GROUPS);
  client.register("/api/beat-ui/showcases", () => SHOWCASES);
}
