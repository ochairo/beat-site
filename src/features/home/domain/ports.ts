import type { FeatureData } from "./types";

export interface HomePort {
  getFeatures(): Promise<readonly FeatureData[]>;
}
