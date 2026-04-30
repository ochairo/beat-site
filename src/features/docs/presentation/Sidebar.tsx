import {
  component,
  type BeatJsxChild,
  type BeatRouteMatch,
} from "@ochairo/beat";

import type { DocSection, DocHeading } from "../domain";
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
              {section.pages.map((page) => {
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
