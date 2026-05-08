import type { PlaygroundTemplate } from "./types";

export interface PlaygroundRepository {
  getTemplates(): Promise<readonly PlaygroundTemplate[]>;
}
