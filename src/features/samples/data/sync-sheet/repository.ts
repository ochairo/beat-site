import type { HttpClient } from "../../../../shared/lib/http/http-client";
import type { SyncSheetPort } from "../../domain/ports";
import type { SyncSheetSnapshot } from "../../domain/types";

export class HttpSyncSheetRepository implements SyncSheetPort {
  constructor(private readonly http: HttpClient) {}

  async getSyncSheetSnapshot(): Promise<SyncSheetSnapshot> {
    return this.http.get<SyncSheetSnapshot>("/api/samples/data-sync-sheet");
  }
}
