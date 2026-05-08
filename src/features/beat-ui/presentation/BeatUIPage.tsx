import {
  Show,
  component,
  onCleanup,
  onMount,
  type BeatJsxChild,
} from "@ochairo/beat";
import { pulse } from "@ochairo/pulse";

import { highlightCode } from "../../../shared/lib/highlight/highlight";
import { SiteLayout } from "../../../shared/layout/Layout";
import { Playground } from "../../../shared/ui/playground/Playground";
import type { ComponentShowcase, NavGroup } from "../domain/types";
import type { NavGroupPort, ShowcasePort } from "../domain/ports";
import { ComponentsSidebar } from "./components/Sidebar";
import css from "./BeatUIPage.module.css";

interface BeatUIData {
  readonly navGroups: readonly NavGroup[];
  readonly showcases: readonly ComponentShowcase[];
}

export interface BeatUIPageProps {
  readonly navGroupPort: NavGroupPort;
  readonly showcasePort: ShowcasePort;
}

const CATEGORIES = ["Actions", "Form", "Feedback", "Layout", "Data", "Icons"];

function buildNameToId(
  showcases: readonly ComponentShowcase[],
): Record<string, string> {
  const nameToId: Record<string, string> = {};
  for (const showcase of showcases) {
    if (!(showcase.name in nameToId)) {
      nameToId[showcase.name] = showcase.id;
    }
  }
  return nameToId;
}

function observeSections(onVisible: (id: string) => void): () => void {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          onVisible(entry.target.id);
          break;
        }
      }
    },
    { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
  );
  document.querySelectorAll("section[id]").forEach((s) => observer.observe(s));
  return () => observer.disconnect();
}

export const BeatUIPage = component<BeatUIPageProps>((props): BeatJsxChild => {
  const activeId = pulse("");
  const data = pulse<BeatUIData | null>(null);

  let disconnectObserver: (() => void) | null = null;
  let unsubscribeData: (() => void) | null = null;

  onMount(() => {
    void Promise.all([
      props.navGroupPort.getNavGroups(),
      props.showcasePort.getShowcases(),
    ]).then(([navGroups, showcases]) => data.set({ navGroups, showcases }));

    unsubscribeData = data.on(() => {
      disconnectObserver?.();
      requestAnimationFrame(() => {
        disconnectObserver = observeSections((id) => activeId.set(id));
      });
    });
  });

  onCleanup(() => {
    disconnectObserver?.();
    unsubscribeData?.();
  });

  return (
    <Show when={data} mapValue={(v) => v !== null}>
      {() => {
        const { navGroups, showcases } = data.get()!;
        const nameToId = buildNameToId(showcases);

        const sidebar = (
          <ComponentsSidebar
            navGroups={navGroups}
            nameToId={nameToId}
            activeId={activeId}
          />
        );

        return (
          <SiteLayout sidebar={sidebar} sidebarMode="fixed">
            <div class={css["inner"]!}>
              <header class={css["header"]!}>
                <h1 class={css["title"]!}>Beat UI Components</h1>
                <p class={css["subtitle"]!}>
                  Beat UI is an optional component library for Beat. <br />
                  It provides a set of pre-built, customizable UI components
                  that you can use in your Beat applications.
                </p>
              </header>

              {CATEGORIES.map((category) => {
                const items = showcases.filter((s) => s.category === category);
                if (items.length === 0) return null;
                return (
                  <div>
                    <p class={css["categoryLabel"]!}>{category}</p>
                    {items.map((showcase) => (
                      <section id={showcase.id} class={css["card"]!}>
                        <div class={css["cardHeader"]!}>
                          <h2 class={css["cardTitle"]!}>{showcase.name}</h2>
                          <span class={css["cardTag"]!}>{showcase.tag}</span>
                        </div>
                        <Playground
                          code={pulse(showcase.code)}
                          label="TSX (sandbox)"
                          highlight={(code) => highlightCode(code, "tsx")}
                          {...(showcase.height !== undefined
                            ? { height: showcase.height }
                            : {})}
                        />
                      </section>
                    ))}
                  </div>
                );
              })}
            </div>
          </SiteLayout>
        );
      }}
    </Show>
  );
});
