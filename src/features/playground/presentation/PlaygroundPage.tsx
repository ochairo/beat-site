import { component, type BeatJsxChild } from "@ochairo/beat";
import { Tab, type TabItem } from "@ochairo/beat-ui";

import { SiteLayout } from "../../../shared/layout";
import type { PlaygroundTemplate } from "../domain";
import css from "./PlaygroundPage.module.css";

export interface PlaygroundPageProps {
  readonly templates: readonly PlaygroundTemplate[];
}

export const PlaygroundPage = component<PlaygroundPageProps>(
  (props): BeatJsxChild => {
    const tabItems: readonly TabItem[] = props.templates.map((template) => ({
      key: template.key,
      label: template.label,
      content: (
        <iframe
          src={template.url}
          class={css["iframe"]!}
          title={template.title}
        />
      ),
    }));

    return (
      <SiteLayout>
        <section class={css["playground"]!}>
          <h1 class={css["title"]!}>Playground</h1>
          <p class={css["subtitle"]!}>
            Try Beat in the browser. Edit, run, and experiment — no setup
            required.
          </p>
          <Tab items={tabItems} defaultValue="basic" />
        </section>
      </SiteLayout>
    );
  },
);
