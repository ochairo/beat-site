import type { ComponentShowcase, NavGroup } from "./types";

export interface NavGroupPort {
  getNavGroups(): Promise<readonly NavGroup[]>;
}

export interface ShowcasePort {
  getShowcases(): Promise<readonly ComponentShowcase[]>;
}
