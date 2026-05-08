import type { PlaygroundTemplate } from "../domain/types";

export const PLAYGROUND_TEMPLATES: readonly PlaygroundTemplate[] = [
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
