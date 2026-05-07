import type { PlaygroundTemplate } from "../domain/types";
import type { PlaygroundRepository } from "../domain/ports";

const TEMPLATES: readonly PlaygroundTemplate[] = [
  {
    key: "basic",
    label: "Basic",
    url: "https://stackblitz.com/github/ochairo/beat-create/tree/main/templates/default?embed=1&file=src/App.tsx&theme=dark",
    title: "Beat Basic",
  },
  {
    key: "ui",
    label: "UI",
    url: "https://stackblitz.com/github/ochairo/beat-create/tree/main/templates/ui?embed=1&file=src/main.tsx&theme=dark",
    title: "Beat UI",
  },
];

export class InMemoryPlaygroundRepository implements PlaygroundRepository {
  async getTemplates(): Promise<readonly PlaygroundTemplate[]> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    return TEMPLATES;
  }
}
