import { component, type BeatJsxChild } from "@ochairo/beat";
import { Tab, type TabItem } from "@ochairo/beat-ui";

import { SiteLayout } from "../../../shared/layout/Layout";
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
          <Tab items={tabItems} defaultValue="basic" />
        </section>
      </SiteLayout>
    );
  },
);
