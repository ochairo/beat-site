export interface NavGroup {
  readonly label: string;
  readonly items: readonly string[];
}

export interface ComponentShowcase {
  readonly id: string;
  readonly name: string;
  readonly tag: string;
  readonly code: string;
  readonly category: string;
  readonly height?: string;
}
