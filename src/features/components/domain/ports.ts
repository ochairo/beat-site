import type { ComponentShowcase, NavGroup } from "./types";

export interface ComponentRepository {
  getNavGroups(): Promise<readonly NavGroup[]>;
  getShowcases(): Promise<readonly ComponentShowcase[]>;
}
