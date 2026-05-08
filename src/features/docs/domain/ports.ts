import type { DocSection } from "./types";

export interface DocsPort {
  getDocSections(): Promise<readonly DocSection[]>;
}
