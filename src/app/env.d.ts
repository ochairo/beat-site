/// <reference types="vite/client" />

/** Exact installed Beat version, injected by Vite at build time. */
declare const __BEAT_VERSION__: string;

declare module "*.md" {
  const content: string;
  export default content;
}

declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}
