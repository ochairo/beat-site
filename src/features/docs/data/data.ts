import type { DocHeading, DocPage, DocSection } from "../domain/types";

import motivationMd from "./content/motivation/index.md?raw";
import beatVsReactViteMd from "./content/motivation/beat-vs-react-vite.md?raw";
import quickStartMd from "./content/beat/quick-start.md?raw";
import integrationMd from "./content/beat/integration.md?raw";
import apiMd from "./content/beat/api.md?raw";
import compilerMd from "./content/beat/compiler.md?raw";
import beatUiBasicsMd from "./content/beat-ui/basics.md?raw";
import beatUiThemingMd from "./content/beat-ui/theming.md?raw";
import pulseBasicsMd from "./content/pulse/basics.md?raw";
import pulseIntegrationMd from "./content/pulse/integration.md?raw";
import pulseApiMd from "./content/pulse/api.md?raw";
import cleanArchitectureMd from "./content/architecture/clean-architecture.md?raw";
import pluginArchitectureMd from "./content/architecture/plugin-architecture.md?raw";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_~[\]()]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractHeadings(content: string): readonly DocHeading[] {
  const headings: DocHeading[] = [];
  const lines = content.split("\n");
  let inCodeBlock = false;
  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    const match = /^(#{2,3})\s+(.+)$/.exec(line);
    if (match) {
      const hashes = match[1] ?? "";
      const text = match[2] ?? "";
      headings.push({
        level: hashes.length,
        text: text.replace(/`/g, ""),
        id: slugify(text),
      });
    }
  }
  return headings;
}

function createPage(title: string, slug: string, content: string): DocPage {
  return { title, slug, content, headings: extractHeadings(content) };
}

const docs: Record<string, string> = {
  motivation: motivationMd,
  "beat-vs-react-vite": beatVsReactViteMd,
  "quick-start": quickStartMd,
  integration: integrationMd,
  api: apiMd,
  compiler: compilerMd,
  "beat-ui-basics": beatUiBasicsMd,
  "beat-ui-theming": beatUiThemingMd,
  "pulse-basics": pulseBasicsMd,
  "pulse-integration": pulseIntegrationMd,
  "pulse-api": pulseApiMd,
  "clean-architecture": cleanArchitectureMd,
  "plugin-architecture": pluginArchitectureMd,
};

export function buildDocSections(): readonly DocSection[] {
  return [
    {
      title: "Start Here",
      pages: [
        createPage("Motivation", "motivation", docs["motivation"] ?? ""),
        createPage(
          "Beat vs React + Vite",
          "beat-vs-react-vite",
          docs["beat-vs-react-vite"] ?? "",
        ),
      ],
    },
    {
      title: "Quick Start",
      pages: [
        createPage("Quick Start", "quick-start", docs["quick-start"] ?? ""),
      ],
    },
    {
      title: "Integration",
      pages: [
        createPage("Integration", "integration", docs["integration"] ?? ""),
      ],
    },
    {
      title: "API Reference",
      pages: [createPage("API Reference", "api", docs["api"] ?? "")],
    },
    {
      title: "Compiler",
      pages: [createPage("Compiler", "compiler", docs["compiler"] ?? "")],
    },
    {
      title: "Beat UI",
      foldable: true,
      pages: [
        createPage("Basics", "beat-ui-basics", docs["beat-ui-basics"] ?? ""),
        createPage("Theming", "beat-ui-theming", docs["beat-ui-theming"] ?? ""),
      ],
    },
    {
      title: "Pulse",
      foldable: true,
      pages: [
        createPage("Basics", "pulse-basics", docs["pulse-basics"] ?? ""),
        createPage(
          "Integration",
          "pulse-integration",
          docs["pulse-integration"] ?? "",
        ),
        createPage("API Reference", "pulse-api", docs["pulse-api"] ?? ""),
      ],
    },
    {
      title: "Recommended Patterns",
      foldable: true,
      pages: [
        createPage(
          "Clean Architecture",
          "clean-architecture",
          docs["clean-architecture"] ?? "",
        ),
        createPage(
          "Plugin Architecture",
          "plugin-architecture",
          docs["plugin-architecture"] ?? "",
        ),
      ],
    },
  ];
}
