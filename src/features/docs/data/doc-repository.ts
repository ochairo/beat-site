import type { DocSection } from "../domain/types";
import type { DocsPort } from "../domain/ports";
import type { HttpClient } from "../../../shared/lib/http/http-client";

export class HttpDocRepository implements DocsPort {
  constructor(private readonly http: HttpClient) {}

  async getDocSections(): Promise<readonly DocSection[]> {
    return this.http.get<readonly DocSection[]>("/api/docs/sections");
  }
}
