import { Show, component, onMount, type BeatJsxChild } from "@ochairo/beat";
import { Tab, type TabItem } from "@ochairo/beat-ui";
import { pulse } from "@ochairo/pulse";

import { SiteLayout } from "../../../shared/layout/Layout";
import type { StackBlitzPort } from "../domain/ports";
import type { PlaygroundTemplate } from "../domain/types";
import css from "./StackBlitzPage.module.css";

export interface StackBlitzPageProps {
  readonly stackBlitzPort: StackBlitzPort;
}

export const StackBlitzPage = component<StackBlitzPageProps>(
  (props): BeatJsxChild => {
    const templates = pulse<readonly PlaygroundTemplate[] | null>(null);

    onMount(() => {
      void props.stackBlitzPort
        .getTemplates()
        .then((data) => templates.set(data));
    });

    return (
      <SiteLayout>
        <section class={css["playground"]!}>
          <Show when={templates} mapValue={(v) => v !== null}>
            {() => {
              const tabItems: readonly TabItem[] = templates
                .get()!
                .map((template) => ({
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
              return <Tab items={tabItems} defaultValue="basic" />;
            }}
          </Show>
        </section>
      </SiteLayout>
    );
  },
);
