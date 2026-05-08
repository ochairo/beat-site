import {
  component,
  type BeatJsxChild,
  type BeatRouteMatch,
} from "@ochairo/beat";
import { pulse, derived } from "@ochairo/pulse";

import type { DocSection, DocHeading, DocPage } from "../../../domain/types";
import css from "./Sidebar.module.css";

export interface SidebarProps {
  readonly sections: readonly DocSection[];
  readonly match: BeatRouteMatch;
}

function renderHeadings(
  headings: readonly DocHeading[],
  slug: string,
): BeatJsxChild {
  if (headings.length === 0) return null;
  return (
    <ul class={css["subList"]!}>
      {headings.map((h) => (
        <li>
          <a
            href={`/beat-site/docs/${slug}#${h.id}`}
            class={h.level === 3 ? css["subLinkDeep"]! : css["subLink"]!}
            onClick={(e: MouseEvent) => {
              e.preventDefault();
              const el = document.getElementById(h.id);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
                history.replaceState(
                  null,
                  "",
                  `/beat-site/docs/${slug}#${h.id}`,
                );
              }
            }}
          >
            {h.text}
          </a>
        </li>
      ))}
    </ul>
  );
}

function getSinglePageTitleClass(active: boolean, first: boolean): string {
  if (active && first) return css["singlePageTitleFirstActive"]!;
  if (active) return css["singlePageTitleActive"]!;
  if (first) return css["singlePageTitleFirst"]!;
  return css["singlePageTitle"]!;
}

export const Sidebar = component<SidebarProps>((props): BeatJsxChild => {
  const currentSlug = props.match.params["slug"] ?? "";

  // One collapsed signal per foldable section, keyed by title.
  // A section starts open if it contains the current active page.
  const collapsedByTitle: Record<
    string,
    ReturnType<typeof pulse<boolean>>
  > = {};
  for (const section of props.sections) {
    if (section.foldable) {
      const hasActivePage = section.pages.some(
        (page) => page.slug === currentSlug,
      );
      collapsedByTitle[section.title] = pulse(!hasActivePage);
    }
  }

  return (
    <div class={css["sidebar"]!}>
      {props.sections.map((section, index) => {
        const singlePage =
          section.pages.length === 1 &&
          section.title === section.pages[0]?.title
            ? section.pages[0]
            : undefined;

        if (singlePage) {
          const active = currentSlug === singlePage.slug;
          return (
            <div>
              <a
                href={`/beat-site/docs/${singlePage.slug}`}
                class={getSinglePageTitleClass(active, index === 0)}
                onClick={(e: MouseEvent) => {
                  e.preventDefault();
                  props.match.navigate(`/docs/${singlePage.slug}`);
                }}
              >
                {section.title}
              </a>
              {active
                ? renderHeadings(singlePage.headings, singlePage.slug)
                : null}
            </div>
          );
        }

        if (section.foldable) {
          const collapsed = collapsedByTitle[section.title]!;
          const chevronTransform = derived(collapsed, (c) =>
            c ? "" : "rotate(90deg)",
          );
          const contentDisplay = derived(collapsed, (c) => (c ? "none" : ""));
          return (
            <div>
              <button
                class={css["sectionTitleToggle"]!}
                onClick={() => {
                  collapsed.set(!collapsed.get());
                }}
              >
                <span>{section.title}</span>
                <i class={css["chevron"]!} style:transform={chevronTransform}>
                  ›
                </i>
              </button>
              <div
                class={css["collapsibleContent"]!}
                style:display={contentDisplay}
              >
                <ul class={css["navList"]!}>
                  {section.pages.map((page: DocPage) => {
                    const active = currentSlug === page.slug;
                    return (
                      <li>
                        <a
                          href={`/beat-site/docs/${page.slug}`}
                          class={
                            active ? css["navLinkActive"]! : css["navLink"]!
                          }
                          onClick={(e: MouseEvent) => {
                            e.preventDefault();
                            props.match.navigate(`/docs/${page.slug}`);
                          }}
                        >
                          {page.title}
                        </a>
                        {active
                          ? renderHeadings(page.headings, page.slug)
                          : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        }

        return (
          <div>
            <div
              class={
                index === 0 ? css["sectionTitleFirst"]! : css["sectionTitle"]!
              }
            >
              {section.title}
            </div>
            <ul class={css["navList"]!}>
              {section.pages.map((page: DocPage) => {
                const active = currentSlug === page.slug;
                return (
                  <li>
                    <a
                      href={`/beat-site/docs/${page.slug}`}
                      class={active ? css["navLinkActive"]! : css["navLink"]!}
                      onClick={(e: MouseEvent) => {
                        e.preventDefault();
                        props.match.navigate(`/docs/${page.slug}`);
                      }}
                    >
                      {page.title}
                    </a>
                    {active ? renderHeadings(page.headings, page.slug) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
});
