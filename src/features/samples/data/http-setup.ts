import type { MockHttpClient } from "../../../shared/lib/http/http-client";
import { createSyncSheetSnapshotSource } from "./sync-sheet/data";

export function registerSamplesEndpoints(client: MockHttpClient): void {
  const nextSyncSheetSnapshot = createSyncSheetSnapshotSource();

  client.register("/api/samples/data-sync-sheet", () =>
    nextSyncSheetSnapshot(),
  );
}
