import type {
  ComponentShowcase,
  NavGroup,
  ComponentRepository,
} from "../domain";

const NAV_GROUPS: readonly NavGroup[] = [
  { label: "Actions", items: ["Button", "Badge"] },
  {
    label: "Form",
    items: [
      "Input",
      "Switch",
      "CheckBox",
      "RadioGroup",
      "TextArea",
      "NumberInput",
      "DateInput",
      "TimeInput",
      "Select",
    ],
  },
  { label: "Feedback", items: ["Loading", "Notification"] },
  {
    label: "Layout",
    items: ["Tab", "Card", "CodeBlock"],
  },
  { label: "Data", items: ["DatePicker", "DataGrid", "Sparkline"] },
  { label: "Icons", items: ["Icons — Common", "Icons — Other"] },
];

const SHOWCASES: readonly ComponentShowcase[] = [
  {
    id: "button",
    name: "Button",
    tag: "atom",
    category: "Actions",
    code: `<Button tone="primary" onPress={() => {}}>
  Primary
</Button>
<Button tone="danger" appearance="soft" onPress={() => {}}>
  Danger Soft
</Button>
<Button tone="primary" appearance="ghost" onPress={() => {}}>
  Ghost
</Button>`,
  },
  {
    id: "badge",
    name: "Badge",
    tag: "atom",
    category: "Actions",
    code: `<Badge tone="primary">Primary</Badge>
<Badge tone="success">Success</Badge>
<Badge tone="warning">Warning</Badge>
<Badge tone="danger">Danger</Badge>
<Badge tone="primary" size="sm">Small</Badge>`,
  },
  {
    id: "input",
    name: "Input",
    tag: "atom",
    category: "Form",
    code: `const value = pulse("");

return (
  <Input
    id="demo-password"
    type="password"
    placeholder="Password"
    value={value}
    onValueChange={(v) => value.set(v)}
  />
)`,
  },
  {
    id: "switch",
    name: "Switch",
    tag: "atom",
    category: "Form",
    code: `const checked = pulse(false);

return (
  <Switch
    id="demo-switch"
    name="demo-switch"
    checked={checked}
    onCheckedChange={(v) => checked.set(v)}
    checkedIcon={<IconSun size={12} />}
    uncheckedIcon={<IconMoon size={12} />}
  >
  </Switch>
)`,
  },
  {
    id: "checkbox",
    name: "CheckBox",
    tag: "atom",
    category: "Form",
    code: `const checked = pulse(false);

return (
  <CheckBox
    id="demo-checkbox"
    name="demo-checkbox"
    checked={checked}
    onCheckedChange={(v) => checked.set(v)}
  >
    Check me
  </CheckBox>
)`,
  },
  {
    id: "radiogroup",
    name: "RadioGroup",
    tag: "molecule",
    category: "Form",
    height: "100px",
    code: `const selected = pulse("a");

return (
  <RadioGroup
    name="demo-radio"
    value={selected}
    onValueChange={(v) => selected.set(v)}
    options={[
      { label: "Option A", value: "a" },
      { label: "Option B", value: "b" },
      { label: "Option C", value: "c" },
    ]}
  />
)`,
  },
  {
    id: "textarea",
    name: "TextArea",
    tag: "atom",
    category: "Form",
    height: "160px",
    code: `const value = pulse("");

return (
  <TextArea
    id="demo-textarea"
    name="demo-textarea"
    placeholder="Write something..."
    value={value}
    onValueChange={(v) => value.set(v)}
  />
)`,
  },
  {
    id: "numberinput",
    name: "NumberInput",
    tag: "molecule",
    category: "Form",
    code: `const value = pulse("");

return (
  <NumberInput
    id="demo-number"
    name="demo-number"
    placeholder="0"
    value={value}
    onValueChange={(v) => value.set(v)}
    min={0}
    max={100}
    step={1}
  />
)`,
  },
  {
    id: "dateinput",
    name: "DateInput",
    tag: "molecule",
    category: "Form",
    height: "420px",
    code: `const date = pulse("");

return (
  <DateInput
    id="demo-date"
    name="demo-date"
    value={date}
    onValueChange={(v) => date.set(v)}
    placeholder="Select a date"
  />
)`,
  },
  {
    id: "timeinput",
    name: "TimeInput",
    tag: "molecule",
    category: "Form",
    height: "300px",
    code: `const value = pulse("");

return (
  <TimeInput
    id="demo-time"
    name="demo-time"
    value={value}
    onValueChange={(v) => value.set(v)}
  />
)`,
  },
  {
    id: "select",
    name: "Select",
    tag: "molecule",
    category: "Form",
    height: "400px",
    code: `<Select
  id="demo-select"
  canSearch
  options={[
    { label: "Fruits", value: "fruits", children: [
      { label: "Apple", value: "apple" },
      { label: "Banana", value: "banana" },
    ]},
    { label: "Vegetables", value: "vegetables", children: [
      { label: "Carrot", value: "carrot" },
      { label: "Broccoli", value: "broccoli" },
    ]},
    { label: "Meat", value: "meat" },
  ]}
  placeholder="Select an option"
/>`,
  },
  {
    id: "multiselect",
    name: "MultiSelect",
    tag: "molecule",
    category: "Form",
    height: "400px",
    code: `const selected = pulse([]);

return (
  <MultiSelect
    id="demo-multiselect"
    canSearch
    value={selected}
    onValueChange={(v) => selected.set(v)}
    options={[
      { label: "Fruits", value: "fruits", children: [
        { label: "Apple", value: "apple" },
        { label: "Banana", value: "banana" },
        { label: "Cherry", value: "cherry" },
      ]},
      { label: "Vegetables", value: "vegetables", children: [
        { label: "Carrot", value: "carrot" },
        { label: "Spinach", value: "spinach" },
      ]},
    ]}
    placeholder="Select items"
  />
)`,
  },
  {
    id: "loading",
    name: "Loading",
    tag: "atom",
    category: "Feedback",
    code: `<Loading label="Loading data..." />`,
  },
  {
    id: "notification",
    name: "Notification",
    tag: "molecule",
    category: "Feedback",
    height: "160px",
    code: `<>
  <Notification tone="info" title="Info">
    This is an informational message.
  </Notification>
  <Notification tone="error" title="Error">
    Something went wrong.
  </Notification>
</>`,
  },
  {
    id: "tab",
    name: "Tab",
    tag: "molecule",
    category: "Layout",
    height: "400px",
    code: `<Tab
  items={[
    { key: "first", label: "First", content: <p>First tab content</p> },
    { key: "second", label: "Second", content: <p>Second tab content</p> },
    { key: "third", label: "Third", content: <p>Third tab content</p> },
  ]}
  defaultValue="first"
/>`,
  },
  {
    id: "cardwrapper",
    name: "Card",
    tag: "atom",
    category: "Layout",
    height: "200px",
    code: `<div style="display:flex;gap:1rem;flex-wrap:wrap">
  <Card padding="md" radius="md">
    <h3 style="margin:0 0 0.5rem 0;color:var(--beat-ui-color-text)">Default</h3>
    <p style="margin:0;color:var(--beat-ui-color-text-muted);font-size:0.85rem">
      Medium padding and radius.
    </p>
  </Card>
  <Card padding="lg" radius="lg">
    <h3 style="margin:0 0 0.5rem 0;color:var(--beat-ui-color-text)">Large</h3>
    <p style="margin:0;color:var(--beat-ui-color-text-muted);font-size:0.85rem">
      Large padding and radius.
    </p>
  </Card>
  <Card padding="sm" radius="sm">
    <h3 style="margin:0 0 0.5rem 0;color:var(--beat-ui-color-text)">Small</h3>
    <p style="margin:0;color:var(--beat-ui-color-text-muted);font-size:0.85rem">
      Small padding and radius.
    </p>
  </Card>
</div>`,
  },
  {
    id: "codeblock",
    name: "CodeBlock",
    tag: "atom",
    category: "Layout",
    height: "180px",
    code: `const code = pulse("const x = 1;\\nconst y = 2;\\nconst sum = x + y;");

return <CodeBlock code={code} id="demo-codeblock" label="TSX" editable />`,
  },
  {
    id: "datepicker",
    name: "DatePicker",
    tag: "molecule",
    category: "Data",
    height: "380px",
    code: `const selected = pulse("");

return (
  <DatePicker
    value={selected}
    onValueChange={(v) => selected.set(v)}
  />
)`,
  },
  {
    id: "datagrid",
    name: "DataGrid",
    tag: "organism",
    category: "Data",
    height: "360px",
    code: `const columns = [
  { key: "name", header: "Name", cellType: "text" },
  { key: "role", header: "Role", cellType: "text" },
  { key: "hours", header: "Hours", cellType: "number", sortable: true },
];

const grid = pulse([
  [{ value: "Ada" }, { value: "Engineer" }, { value: "40" }],
  [{ value: "Grace" }, { value: "Designer" }, { value: "36" }],
  [{ value: "Lois" }, { value: "Manager" }, { value: "42" }],
]);

return (
  <DataGrid
    columns={columns}
    value={grid}
    showRowHeaders
    rowCount={5}
  />
)`,
  },
  {
    id: "sparkline",
    name: "Sparkline",
    tag: "atom",
    category: "Data",
    code: `const values = pulse([4, 7, 2, 8, 5, 9, 3, 6, 8, 4]);

return <Sparkline values={values} />`,
  },
  {
    id: "icons-—-common",
    name: "Icons — Common",
    tag: "25 icons",
    category: "Icons",
    height: "100px",
    code: `<>
  <IconCheck size={24} />
  <IconClose size={24} />
  <IconSearch size={24} />
  <IconPlus size={24} />
  <IconEdit size={24} />
  <IconTrash size={24} />
  <IconSettings size={24} />
  <IconInfo size={24} />
  <IconWarning size={24} />
  <IconSuccess size={24} />
  <IconError size={24} />
  <IconCopy size={24} />
  <IconEye size={24} />
  <IconSun size={24} />
  <IconMoon size={24} />
  <IconGithub size={24} />
  <IconTerminal size={24} />
  <IconCode size={24} />
  <IconPackage size={24} />
  <IconMenu size={24} />
  <IconLink size={24} />
  <IconExternalLink size={24} />
  <IconArrowRight size={24} />
  <IconChevronRight size={24} />
  <IconChevronDown size={24} />
</>`,
  },
  {
    id: "icons-—-other",
    name: "Icons — Other",
    tag: "9 icons",
    category: "Icons",
    code: `<>
  <IconBeatReactivity size={24} />
  <IconBeatDirectDom size={24} />
  <IconBeatRouter size={24} />
  <IconBeatResource size={24} />
  <IconBeatTypeScript size={24} />
  <IconBeatRunOnce size={24} />
  <IconBeatPulse size={24} />
  <IconBeatComponent size={24} />
  <IconBeatJsx size={24} />
</>`,
  },
];

export class InMemoryComponentRepository implements ComponentRepository {
  async getNavGroups(): Promise<readonly NavGroup[]> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    return NAV_GROUPS;
  }

  async getShowcases(): Promise<readonly ComponentShowcase[]> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    return SHOWCASES;
  }
}
