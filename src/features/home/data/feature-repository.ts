import type { HomePort } from "../domain/ports";
import type { HttpClient } from "../../../shared/lib/http/http-client";
import type { FeatureData } from "../domain/types";

export class HttpFeatureRepository implements HomePort {
  constructor(private readonly http: HttpClient) {}

  async getFeatures(): Promise<readonly FeatureData[]> {
    return this.http.get<readonly FeatureData[]>("/api/home/features");
  }
}
