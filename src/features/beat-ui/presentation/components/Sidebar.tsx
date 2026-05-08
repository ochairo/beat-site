import { component, type BeatJsxChild } from "@ochairo/beat";
import { derived, type Pulse } from "@ochairo/pulse";

import type { NavGroup } from "../../domain/types";
import css from "./Sidebar.module.css";

export interface ComponentsSidebarProps {
  readonly navGroups: readonly NavGroup[];
  readonly nameToId: Record<string, string>;
  readonly activeId: Pulse<string>;
}

export const ComponentsSidebar = component<ComponentsSidebarProps>(
  (props): BeatJsxChild => {
    return (
      <div class={css["sidebar"]!}>
        {props.navGroups.map((group, index) => {
          const groupIds = group.items.map(
            (item: string) =>
              props.nameToId[item] ?? item.toLowerCase().replace(/\s+/g, "-"),
          );
          const isGroupActive = derived(props.activeId, (a) =>
            groupIds.includes(a),
          );
          return (
            <div>
              <div
                class={isGroupActive.on((active) =>
                  active
                    ? index === 0
                      ? css["groupTitleFirstActive"]!
                      : css["groupTitleActive"]!
                    : index === 0
                      ? css["groupTitleFirst"]!
                      : css["groupTitle"]!,
                )}
              >
                {group.label}
              </div>
              <ul class={css["subList"]!}>
                {group.items.map((item: string) => {
                  const id =
                    props.nameToId[item] ??
                    item.toLowerCase().replace(/\s+/g, "-");
                  return (
                    <li>
                      <a
                        href={`#${id}`}
                        class={css["subLink"]!}
                        onClick={(e: MouseEvent) => {
                          e.preventDefault();
                          props.activeId.set(id);
                          document
                            .getElementById(id)
                            ?.scrollIntoView({ behavior: "smooth" });
                        }}
                      >
                        {item}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    );
  },
);
