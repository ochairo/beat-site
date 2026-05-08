import type { NavGroup, ComponentShowcase } from "../domain/types";
import type { NavGroupPort, ShowcasePort } from "../domain/ports";
import type { HttpClient } from "../../../shared/lib/http/http-client";

export class HttpComponentRepository implements NavGroupPort, ShowcasePort {
  constructor(private readonly http: HttpClient) {}

  async getNavGroups(): Promise<readonly NavGroup[]> {
    return this.http.get<readonly NavGroup[]>("/api/beat-ui/nav-groups");
  }

  async getShowcases(): Promise<readonly ComponentShowcase[]> {
    return this.http.get<readonly ComponentShowcase[]>(
      "/api/beat-ui/showcases",
    );
  }
}
