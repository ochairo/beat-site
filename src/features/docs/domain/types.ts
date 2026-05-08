export interface DocHeading {
  readonly text: string;
  readonly id: string;
  readonly level: number;
}

export interface DocPage {
  readonly title: string;
  readonly slug: string;
  readonly content: string;
  readonly headings: readonly DocHeading[];
}

export interface DocSection {
  readonly title: string;
  readonly pages: readonly DocPage[];
  readonly foldable?: boolean;
}
