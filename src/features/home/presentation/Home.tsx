import {
  Show,
  component,
  onMount,
  type BeatJsxChild,
  type BeatRouteMatch,
} from "@ochairo/beat";
import {
  IconReact,
  IconAim,
  IconRoute,
  IconCrossArrowsToRight,
  IconTypeScript,
  IconPlay,
  CodeBlock,
} from "@ochairo/beat-ui";
import { pulse } from "@ochairo/pulse";

import { SiteLayout } from "../../../shared/layout/Layout";
import { highlightCode } from "../../../shared/lib/highlight/highlight";
import type { HomePort } from "../domain/ports";
import type { FeatureData } from "../domain/types";
import css from "./Home.module.css";

const ICON_COLOR = "var(--beat-ui-color-primary)";

const ICON_MAP: Record<string, BeatJsxChild> = {
  reactivity: <IconReact color={ICON_COLOR} />,
  "direct-dom": <IconAim color={ICON_COLOR} />,
  router: <IconRoute color={ICON_COLOR} />,
  resource: <IconCrossArrowsToRight color={ICON_COLOR} />,
  typescript: <IconTypeScript color={ICON_COLOR} />,
  "run-once": <IconPlay color={ICON_COLOR} />,
};

export interface HomePageProps {
  readonly match: BeatRouteMatch;
  readonly homePort: HomePort;
}

export const HomePage = component<HomePageProps>((props): BeatJsxChild => {
  const features = pulse<readonly FeatureData[] | null>(null);

  onMount(() => {
    void props.homePort.getFeatures().then((data) => features.set(data));
  });

  return (
    <SiteLayout contentStyle="display:flex;flex-direction:column;min-height:0;padding:0;">
      <div class={css["page"]!}>
        <section class={css["hero"]!}>
          <div class={css["heroLeft"]!}>
            <h1 class={css["title"]!}>
              <span class={css["highlight"]!}>Beat</span>
            </h1>
            <h2 class={css["subtitle"]!}>Pulse-native JSX framework</h2>
            <p class={css["description"]!}>
              Direct-DOM rendering with fine-grained reactivity. Explicit
              routing and async primitives. No virtual DOM.
            </p>
            <div class={css["buttons"]!}>
              <a
                href="/beat-site/docs/quick-start"
                class={css["primaryButton"]!}
                onClick={(e: MouseEvent) => {
                  e.preventDefault();
                  props.match.navigate("/docs/quick-start");
                }}
              >
                Quick start
              </a>
              <a
                href="https://github.com/ochairo/beat"
                target="_blank"
                rel="noopener noreferrer"
                class={css["secondaryButton"]!}
              >
                View on GitHub
              </a>
            </div>
          </div>
          <div class={css["heroRight"]!}>
            <CodeBlock
              code={pulse(
                `import { component } from '@ochairo/beat'\nimport { render } from '@ochairo/beat/render'\n\nconst App = component(() => (\n  <h1>Hello Beat!</h1>\n  <h2>Pulse-Native JSX framework</h2>\n  <p>Fast, reactive, no virtual DOM.</p>\n))\nrender(App, document.getElementById('root')!)`,
              )}
              label="TSX"
              copyable={false}
              highlight={(c) => highlightCode(c, "tsx")}
            />
          </div>
        </section>
        <div class={css["heartbeatLine"]!}>
          <svg viewBox="0 0 800 80" preserveAspectRatio="none">
            <path
              class={css["ecgPath"]!}
              d="M0,40 L330,40 L350,36 L360,44 L365,40 L375,40 L380,4 L390,76 L398,24 L405,48 L412,40 L440,40 L800,40"
              fill="none"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <section class={css["features"]!}>
          <Show when={features} mapValue={(v) => v !== null}>
            {() =>
              features.get()!.map((feature) => (
                <div class={css["featureCard"]!}>
                  <h3 class={css["featureTitle"]!}>
                    {ICON_MAP[feature.icon] ?? null}
                    {feature.title}
                  </h3>
                  <p class={css["featureDesc"]!}>{feature.description}</p>
                </div>
              ))
            }
          </Show>
        </section>
        <footer class={css["footer"]!}>
          <div class={css["footerLine"]!} />
          <div class={css["footerContent"]!}>
            <a
              href="https://github.com/ochairo/beat/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              class={css["footerLink"]!}
            >
              License
            </a>
            <span class={css["footerDot"]!}>·</span>
            <a
              href="https://github.com/ochairo/beat/discussions"
              target="_blank"
              rel="noopener noreferrer"
              class={css["footerLink"]!}
            >
              Discussions
            </a>
            <span class={css["footerDot"]!}>·</span>
            <a
              href="https://github.com/ochairo/beat/issues"
              target="_blank"
              rel="noopener noreferrer"
              class={css["footerLink"]!}
            >
              Issues
            </a>
            <span class={css["footerDot"]!}>·</span>
            <a
              href="https://github.com/ochairo/beat/releases"
              target="_blank"
              rel="noopener noreferrer"
              class={css["footerLink"]!}
            >
              Releases
            </a>
            <span class={css["footerDot"]!}>·</span>
            <a
              href="https://www.npmjs.com/package/@ochairo/beat"
              target="_blank"
              rel="noopener noreferrer"
              class={css["footerLink"]!}
            >
              npm
            </a>
          </div>
        </footer>
      </div>
    </SiteLayout>
  );
});
