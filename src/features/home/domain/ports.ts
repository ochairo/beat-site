import type { FeatureData } from "./types";

export interface FeatureRepository {
  getFeatures(): Promise<readonly FeatureData[]>;
}
