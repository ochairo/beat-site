import {
  Show,
  component,
  onMount,
  type BeatJsxChild,
  type BeatRouteMatch,
} from "@ochairo/beat";
import { pulse } from "@ochairo/pulse";

import type { DocSection } from "../domain/types";
import type { DocsPort } from "../domain/ports";
import { SiteLayout } from "../../../shared/layout/Layout";
import { Sidebar } from "./components/sidebar/Sidebar";
import { replaceCodeBlocks } from "../infrastructure/code-blocks";
import { renderMermaidBlocks } from "../infrastructure/mermaid";
import { renderMarkdown } from "../infrastructure/markdown";
import css from "./DocPage.module.css";

export interface DocsPageProps {
  readonly match: BeatRouteMatch;
  readonly docsPort: DocsPort;
}

export const DocsPage = component<DocsPageProps>((props): BeatJsxChild => {
  const sections = pulse<readonly DocSection[] | null>(null);

  onMount(() => {
    void props.docsPort.getDocSections().then((data) => sections.set(data));
  });

  const slug = props.match.params["slug"] ?? "getting-started";

  return (
    <Show when={sections} mapValue={(v) => v !== null}>
      {() => {
        const data = sections.get()!;
        const page = data.flatMap((s) => s.pages).find((p) => p.slug === slug);
        const sidebar = <Sidebar sections={data} match={props.match} />;

        if (!page) {
          return (
            <SiteLayout sidebar={sidebar} sidebarMode="fixed">
              <div class={css["notFound"]!}>
                <h2>Page not found</h2>
                <p>No documentation page matches "{slug}".</p>
              </div>
            </SiteLayout>
          );
        }

        return (
          <SiteLayout sidebar={sidebar} sidebarMode="fixed">
            {renderMarkdown(page.content, (container) => {
              replaceCodeBlocks(container);
              void renderMermaidBlocks(container);
            })}
          </SiteLayout>
        );
      }}
    </Show>
  );
});
