import { render, type BeatCleanup } from "@ochairo/beat";
import { CodeBlock } from "@ochairo/beat-ui";
import { pulse } from "@ochairo/pulse";

import { highlightCode } from "../../../shared/lib/highlight/highlight";

export function replaceCodeBlocks(container: HTMLElement): BeatCleanup[] {
  const cleanups: BeatCleanup[] = [];
  const preElements = container.querySelectorAll("pre");

  for (const pre of preElements) {
    const codeEl = pre.querySelector("code");
    if (!codeEl) continue;

    const classAttr = codeEl.className ?? "";
    const langMatch = /language-(\w+)/.exec(classAttr);
    const language = langMatch?.[1] ?? "";

    if (language === "mermaid") continue;

    const code = codeEl.textContent ?? "";
    const wrapper = document.createElement("div");
    pre.replaceWith(wrapper);

    const cleanup = render(
      wrapper,
      CodeBlock({
        code: pulse(code),
        label: language.toUpperCase() || "CODE",
        ...(language
          ? { highlight: (c: string) => highlightCode(c, language) }
          : {}),
      }),
    );

    cleanups.push(cleanup);
  }

  return cleanups;
}
