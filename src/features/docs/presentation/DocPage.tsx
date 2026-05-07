import {
  component,
  type BeatJsxChild,
  type BeatRouteMatch,
} from "@ochairo/beat";

import type { DocSection } from "../domain";
import { SiteLayout } from "../../../shared/layout/Layout";
import { Sidebar } from "./components/sidebar/Sidebar";
import { replaceCodeBlocks } from "../infrastructure/code-blocks";
import { renderMermaidBlocks } from "../infrastructure/mermaid";
import { renderMarkdown } from "../infrastructure/markdown";
import css from "./DocPage.module.css";

export interface DocsPageProps {
  readonly match: BeatRouteMatch;
  readonly sections: readonly DocSection[];
}

export const DocsPage = component<DocsPageProps>((props): BeatJsxChild => {
  const slug = props.match.params["slug"] ?? "getting-started";
  const sidebar = <Sidebar sections={props.sections} match={props.match} />;

  const page = props.sections
    .flatMap((s) => s.pages)
    .find((p) => p.slug === slug);

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
});
