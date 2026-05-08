import type { PlaygroundTemplate } from "../domain/types";
import type { StackBlitzPort } from "../domain/ports";
import type { HttpClient } from "../../../shared/lib/http/http-client";

export class HttpPlaygroundRepository implements StackBlitzPort {
  constructor(private readonly http: HttpClient) {}

  async getTemplates(): Promise<readonly PlaygroundTemplate[]> {
    return this.http.get<readonly PlaygroundTemplate[]>(
      "/api/stackblitz/templates",
    );
  }
}
