import type { PlaygroundTemplate } from "./types";

export interface StackBlitzPort {
  getTemplates(): Promise<readonly PlaygroundTemplate[]>;
}
