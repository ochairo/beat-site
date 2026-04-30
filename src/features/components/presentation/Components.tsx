import { component, type BeatJsxChild } from "@ochairo/beat";
import { pulse } from "@ochairo/pulse";

import { highlightCode } from "../../../shared/highlight";
import { SiteLayout } from "../../../shared/layout";
import { Playground } from "../../../shared/playground/Playground";
import type { ComponentShowcase, NavGroup } from "../domain";
import css from "./Components.module.css";

export interface ComponentsPageProps {
  readonly navGroups: readonly NavGroup[];
  readonly showcases: readonly ComponentShowcase[];
}

const CATEGORIES = ["Actions", "Form", "Feedback", "Layout", "Data", "Icons"];

export const ComponentsPage = component<ComponentsPageProps>(
  (props): BeatJsxChild => {
    const sidebar = (
      <div class={css["sidebarContent"]!}>
        {props.navGroups.map((group, index) => (
          <div>
            <div
              class={index === 0 ? css["groupTitleFirst"]! : css["groupTitle"]!}
            >
              {group.label}
            </div>
            <ul class={css["navList"]!}>
              {group.items.map((item) => (
                <li>
                  <a
                    href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                    class={css["navLink"]!}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );

    return (
      <SiteLayout sidebar={sidebar} sidebarMode="fixed">
        <div class={css["inner"]!}>
          <header class={css["header"]!}>
            <h1 class={css["title"]!}>Beat UI Components</h1>
            <p class={css["subtitle"]!}>
              Beat UI is an optional component library for Beat. <br />
              It provides a set of pre-built, customizable UI components that
              you can use in your Beat applications.
            </p>
          </header>

          {CATEGORIES.map((category) => {
            const items = props.showcases.filter(
              (s) => s.category === category,
            );
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
                      label="TSX"
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
  },
);
