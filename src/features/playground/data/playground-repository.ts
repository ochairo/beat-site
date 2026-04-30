import type { PlaygroundTemplate, PlaygroundRepository } from "../domain";

const TEMPLATES: readonly PlaygroundTemplate[] = [
  {
    key: "basic",
    label: "Basic",
    url: "https://stackblitz.com/github/ochairo/beat-create/tree/main/templates/default?embed=1&file=src/App.tsx&theme=dark",
    title: "Beat Basic",
  },
  {
    key: "showcases",
    label: "Showcases",
    url: "https://stackblitz.com/github/ochairo/beat-create/tree/main/templates/showcases?embed=1&file=src/main.tsx&theme=dark",
    title: "Beat Showcases",
  },
];

export class InMemoryPlaygroundRepository implements PlaygroundRepository {
  async getTemplates(): Promise<readonly PlaygroundTemplate[]> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    return TEMPLATES;
  }
}
