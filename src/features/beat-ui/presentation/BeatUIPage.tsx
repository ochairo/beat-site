import { component, onMount, type BeatJsxChild } from "@ochairo/beat";
import { pulse } from "@ochairo/pulse";

import { highlightCode } from "../../../shared/lib/highlight/highlight";
import { SiteLayout } from "../../../shared/layout/Layout";
import { Playground } from "../../../shared/ui/playground/Playground";
import type { ComponentShowcase, NavGroup } from "../domain/types";
import { ComponentsSidebar } from "./components/Sidebar";
import css from "./BeatUIPage.module.css";

export interface BeatUIPageProps {
  readonly navGroups: readonly NavGroup[];
  readonly showcases: readonly ComponentShowcase[];
}

const CATEGORIES = ["Actions", "Form", "Feedback", "Layout", "Data", "Icons"];

export const BeatUIPage = component<BeatUIPageProps>((props): BeatJsxChild => {
  const activeId = pulse("");

  // Map from nav item name to the first matching showcase id
  const nameToId: Record<string, string> = {};
  for (const showcase of props.showcases) {
    if (!(showcase.name in nameToId)) {
      nameToId[showcase.name] = showcase.id;
    }
  }

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            activeId.set(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    );

    const sections = document.querySelectorAll("section[id]");
    sections.forEach((s) => observer.observe(s));

    return () => observer.disconnect();
  });

  const sidebar = (
    <ComponentsSidebar
      navGroups={props.navGroups}
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
            It provides a set of pre-built, customizable UI components that you
            can use in your Beat applications.
          </p>
        </header>

        {CATEGORIES.map((category) => {
          const items = props.showcases.filter((s) => s.category === category);
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
});
