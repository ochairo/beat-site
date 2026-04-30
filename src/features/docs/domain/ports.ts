import type { DocSection } from "./types";

export interface DocRepository {
  getDocSections(): Promise<readonly DocSection[]>;
}
