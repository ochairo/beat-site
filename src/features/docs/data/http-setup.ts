import type { MockHttpClient } from "../../../shared/lib/http/http-client";
import { buildDocSections } from "./data";

export function registerDocsEndpoints(client: MockHttpClient): void {
  client.register("/api/docs/sections", () => buildDocSections());
}
