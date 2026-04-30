import type { DocHeading, DocPage, DocSection, DocRepository } from "../domain";

import motivationMd from "./content/motivation/index.md?raw";
import quickStartMd from "./content/beat/quick-start.md?raw";
import integrationMd from "./content/beat/integration.md?raw";
import apiMd from "./content/beat/api.md?raw";
import pulseQuickStartMd from "./content/pulse/quick-start.md?raw";
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
  "quick-start": quickStartMd,
  integration: integrationMd,
  api: apiMd,
  "pulse-quick-start": pulseQuickStartMd,
  "pulse-integration": pulseIntegrationMd,
  "pulse-api": pulseApiMd,
  "clean-architecture": cleanArchitectureMd,
  "plugin-architecture": pluginArchitectureMd,
};

function buildDocSections(): readonly DocSection[] {
  return [
    {
      title: "Motivation",
      pages: [createPage("Motivation", "motivation", docs["motivation"] ?? "")],
    },
    {
      title: "Beat",
      pages: [
        createPage("Quick Start", "quick-start", docs["quick-start"] ?? ""),
        createPage("Integration", "integration", docs["integration"] ?? ""),
        createPage("API", "api", docs["api"] ?? ""),
      ],
    },
    {
      title: "Pulse",
      pages: [
        createPage(
          "Quick Start",
          "pulse-quick-start",
          docs["pulse-quick-start"] ?? "",
        ),
        createPage(
          "Integration",
          "pulse-integration",
          docs["pulse-integration"] ?? "",
        ),
        createPage("API", "pulse-api", docs["pulse-api"] ?? ""),
      ],
    },
    {
      title: "Architecture",
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

export class InMemoryDocRepository implements DocRepository {
  private sections: readonly DocSection[] | undefined;

  async getDocSections(): Promise<readonly DocSection[]> {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 0));

    if (!this.sections) {
      this.sections = buildDocSections();
    }
    return this.sections;
  }
}
