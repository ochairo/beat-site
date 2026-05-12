import type { ComponentShowcase, NavGroup } from "../domain/types";

export const NAV_GROUPS: readonly NavGroup[] = [
  { label: "Actions", items: ["Button", "Badge"] },
  {
    label: "Form",
    items: [
      "Input",
      "Switch",
      "Slider",
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
  {
    label: "Data",
    items: [
      "Sheet",
      "DatePicker",
      "Sparkline",
      "BarChart",
      "AreaChart",
      "LineChart",
      "PieChart",
      "ScatterPlot",
    ],
  },
  { label: "Icons", items: ["Icons — Common", "Icons — Other"] },
];

export const SHOWCASES: readonly ComponentShowcase[] = [
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
    id: "slider",
    name: "Slider",
    tag: "atom",
    category: "Form",
    code: `const value = pulse(50);

return (
  <Slider
    min={0}
    max={100}
    step={1}
    value={value}
    onValueChange={(v) => value.set(v)}
  />
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
    height: "200px",
    code: `const selected = pulse("a");

return (
  <div style="display:flex;flex-direction:column;gap:1.5rem">
    <div>
      <p style="margin:0 0 0.5rem;font-size:0.8rem;)">Vertical (default)</p>
      <RadioGroup
        name="demo-radio-v"
        value={selected}
        onValueChange={(v) => selected.set(v)}
        options={[
          { label: "Option A", value: "a" },
          { label: "Option B", value: "b" },
          { label: "Option C", value: "c" },
        ]}
      />
    </div>
    <div>
      <p style="margin:0 0 0.5rem;font-size:0.8rem;">Horizontal</p>
      <RadioGroup
        name="demo-radio-h"
        value={selected}
        onValueChange={(v) => selected.set(v)}
        orientation="horizontal"
        options={[
          { label: "Option A", value: "a" },
          { label: "Option B", value: "b" },
          { label: "Option C", value: "c" },
        ]}
      />
    </div>
  </div>
)`,
  },
  {
    id: "textarea",
    name: "TextArea",
    tag: "atom",
    category: "Form",
    height: "120px",
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
    height: "350px",
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
    height: "350px",
    code: `const value = pulse("");
const valueDisabled = pulse("");
const value24 = pulse("");
const valueCustom = pulse("");

return (
  <div style="display:flex;flex-direction:column;gap:1.5rem">
    <div>
      <p style="margin:0 0 0.5rem;font-size:0.8rem;">Basic (minuteStep=5)</p>
      <TimeInput
        id="demo-time"
        name="demo-time"
        value={value}
        minuteStep={5}
        onValueChange={(v) => value.set(v)}
      />
    </div>
    <div>
      <p style="margin:0 0 0.5rem;font-size:0.8rem;">Custom hours (000:00 – 100:59)</p>
      <TimeInput
        id="demo-time-custom"
        name="demo-time-custom"
        value={valueCustom}
        maxHour={100}
        minuteStep={15}
        onValueChange={(v) => valueCustom.set(v)}
      />
    </div>
  </div>
)`,
  },
  {
    id: "select",
    name: "Select",
    tag: "molecule",
    category: "Form",
    height: "370px",
    code: `<Select
  id="demo-select"
  canSearch
  options={[
    { label: "Fruits", value: "fruits", isSelectable: true, children: [
      { label: "Apple", value: "apple" },
      { label: "Banana", value: "banana" },
    ]},
    { label: "Vegetables", value: "vegetables", isSelectable: true, children: [
      { label: "Carrot", value: "carrot" },
      { label: "Broccoli", value: "broccoli" },
    ]},  ]}
  placeholder="Select an option"
/>`,
  },
  {
    id: "multiselect",
    name: "MultiSelect",
    tag: "molecule",
    category: "Form",
    height: "470px",
    code: `const FOOD_OPTIONS = [
  { label: "Fruits", value: "fruits", children: [
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Cherry", value: "cherry" },
  ]},
  { label: "Vegetables", value: "vegetables", children: [
    { label: "Carrot", value: "carrot" },
    { label: "Spinach", value: "spinach" },
  ]},
];

const basic = pulse([]);
const cascade = pulse([]);

return (
  <div style="display:flex;flex-direction:column;gap:1.5rem">
    <div>
      <p style="margin:0 0 0.5rem;font-size:0.8rem;">Basic</p>
      <MultiSelect
        id="demo-multiselect-basic"
        canSearch
        value={basic}
        onValueChange={(v) => basic.set(v)}
        options={FOOD_OPTIONS}
        placeholder="Select items"
      />
    </div>
    <div>
      <p style="margin:0 0 0.5rem;font-size:0.8rem;">Cascade select (auto-selects children)</p>
      <MultiSelect
        id="demo-multiselect-cascade"
        cascadeSelect
        value={cascade}
        onValueChange={(v) => cascade.set(v)}
        options={FOOD_OPTIONS}
        placeholder="Select items"
      />
    </div>
  </div>
)`,
  },
  {
    id: "loading",
    name: "Loading",
    tag: "atom",
    category: "Feedback",
    code: `<Loading label="Spinner" />
<Loading type="equalizer" label="Equalizer" />
<Loading type="pulse" label="Pulse" />
<Loading type="beat" label="Beat" />`,
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
    height: "140px",
    code: `<div style="display:flex;gap:1rem;flex-wrap:wrap">
  <Card padding="md" radius="md">
    <h3 style="margin:0 0 0.5rem 0;color:var(--beat-ui-color-text)">Default</h3>
    <p style="margin:0;font-size:0.85rem;">
      Medium padding and radius.
    </p>
  </Card>
  <Card padding="lg" radius="lg">
    <h3 style="margin:0 0 0.5rem 0;color:var(--beat-ui-color-text)">Large</h3>
    <p style="margin:0;font-size:0.85rem;">
      Large padding and radius.
    </p>
  </Card>
  <Card padding="sm" radius="sm">
    <h3 style="margin:0 0 0.5rem 0;color:var(--beat-ui-color-text)">Small</h3>
    <p style="margin:0;font-size:0.85rem;">
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
    id: "sheet",
    name: "Sheet",
    tag: "organism",
    category: "Data",
    height: "450px",
    code: `const statusOptions = [
  { label: "Backlog", value: "Backlog" },
  { label: "Ready", value: "Ready" },
  { label: "In Progress", value: "In Progress" },
  { label: "Review", value: "Review" },
  { label: "Done", value: "Done" },
];

const trackOptions = [
  { label: "API", value: "API" },
  { label: "Growth", value: "Growth" },
  { label: "Infra", value: "Infra" },
  { label: "QA", value: "QA" },
  { label: "UX", value: "UX" },
];

const owners = ["Aiko", "Maya", "Ren", "Kai"];
const meetingTimes = ["09:15", "11:00", "14:30"];

const createRow = (index) => {
  const dueDay = String(12 + (index % 14)).padStart(2, "0");

  return {
    id: "release-" + (index + 1),
    initiative: pulse("Release track " + (index + 1)),
    owner: pulse(owners[index % owners.length]),
    points: pulse(3 + ((index * 5) % 13)),
    dueDate: pulse("2026-05-" + dueDay),
    standup: pulse(meetingTimes[index % meetingTimes.length]),
    status: pulse(statusOptions[index % statusOptions.length].value),
    tracks: pulse([trackOptions[index % trackOptions.length].value]),
    blocked: pulse(index % 5 === 0),
    notes: pulse(
      index % 3 === 0
        ? "Waiting on content sign-off."
        : "Ready for the next handoff.",
    ),
  };
};

const rows = Array.from({ length: 24 }, (_, index) => createRow(index));

const columns = [
  { id: "initiative", title: "Initiative", width: "15rem", dataType: "text", getValueState: (row) => row.initiative },
  { id: "owner", title: "Owner", width: "9rem", dataType: "text", editable: false, getValueState: (row) => row.owner },
  { id: "points", title: "Pts", width: "7rem", align: "right", dataType: "integer", renderValue: (value) => String(value) + " pts", getValueState: (row) => row.points },
  { id: "dueDate", title: "Ship Date", width: "9rem", dataType: "date", getValueState: (row) => row.dueDate },
  { id: "standup", title: "Standup", width: "8rem", dataType: "time", getValueState: (row) => row.standup },
  { id: "status", title: "Status", width: "10rem", dataType: "select", options: statusOptions, getValueState: (row) => row.status },
  { id: "tracks", title: "Tracks", width: "12rem", dataType: "multiselect", options: trackOptions, getValueState: (row) => row.tracks },
  { id: "blocked", title: "Blocked", width: "8rem", dataType: "checkbox", renderValue: (value) => (value === true ? "Yes" : ""), getValueState: (row) => row.blocked },
  { id: "notes", title: "Notes", width: "20rem", minHeight: "4.5rem", dataType: "textarea", editValueBehavior: "freeze", getValueState: (row) => row.notes },
];

return (
  <div style="display:grid;gap:0.75rem;width:100%">
    <Sheet
      ariaLabel="Release planning sheet"
      editValueBehavior="sync-until-dirty"
      getRowId={(row) => row.id}
      height="25rem"
      rowVirtualizationRootMargin="320px 0px 160px 0px"
      rows={rows}
      columns={columns}
      stickyColumnCount={1}
      virtualizeRows
    />
  </div>
)`,
  },
  {
    id: "datepicker",
    name: "DatePicker",
    tag: "molecule",
    category: "Data",
    height: "350px",
    code: `const selected = pulse("");

return (
  <DatePicker
    value={selected}
    onValueChange={(v) => selected.set(v)}
  />
)`,
  },
  {
    id: "sparkline",
    name: "Sparkline",
    tag: "atom",
    category: "Data",
    height: "250px",
    code: `const values = pulse([4, 7, 2, 8, 5, 9, 3, 6, 8, 4]);

return (
  <div style="width:100%;height:100%;display:flex;align-items:center;">
    <Sparkline values={values} width={800} height={220} />
  </div>
)`,
  },
  {
    id: "barchart",
    name: "BarChart",
    tag: "atom",
    category: "Data",
    height: "300px",
    code: `const series = pulse([
  { label: "Revenue", values: [42, 58, 35, 70, 55, 80, 62] },
  { label: "Costs",   values: [28, 34, 22, 45, 31, 50, 38] },
]);
const cats = pulse(["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]);

return (
  <div style="display:flex;align-items:center;justify-content:center">
    <BarChart series={series} categories={cats} width={600} height={260} />
  </div>
)`,
  },
  {
    id: "areachart",
    name: "AreaChart",
    tag: "atom",
    category: "Data",
    height: "300px",
    code: `const series = pulse([
  { label: "Users",    values: [120, 180, 150, 240, 210, 300, 270] },
  { label: "Sessions", values: [80,  140, 110, 190, 160, 240, 210] },
]);
const cats = pulse(["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]);

return (
  <div style="display:flex;align-items:center;justify-content:center">
    <AreaChart series={series} categories={cats} width={600} height={260} />
  </div>
)`,
  },
  {
    id: "linechart",
    name: "LineChart",
    tag: "atom",
    category: "Data",
    height: "300px",
    code: `const series = pulse([
  { label: "2024", values: [10, 25, 18, 40, 35, 55, 48], showDots: true },
  { label: "2025", values: [15, 30, 22, 48, 42, 65, 58], showDots: true, dashed: true },
]);
const cats = pulse(["Jan","Feb","Mar","Apr","May","Jun","Jul"]);

return (
  <div style="display:flex;align-items:center;justify-content:center">
    <LineChart series={series} categories={cats} width={600} height={260} />
  </div>
)`,
  },
  {
    id: "piechart",
    name: "PieChart",
    tag: "atom",
    category: "Data",
    height: "320px",
    code: `const slices = pulse([
  { label: "Chrome",  value: 63 },
  { label: "Safari",  value: 20 },
  { label: "Firefox", value: 9 },
  { label: "Edge",    value: 5 },
  { label: "Other",   value: 3 },
]);

return (
  <div style="display:flex;gap:2rem;align-items:flex-start;justify-content:center">
    <div>
      <p style="margin:0 0 0.5rem;font-size:0.8rem;opacity:0.6">Pie</p>
      <PieChart slices={slices} size={220} donut={false} showLabels showLegend={false} />
    </div>
    <div>
      <p style="margin:0 0 0.5rem;font-size:0.8rem;opacity:0.6">Donut</p>
      <PieChart slices={slices} size={220} donut showLabels />
    </div>
  </div>
)`,
  },
  {
    id: "scatterplot",
    name: "ScatterPlot",
    tag: "atom",
    category: "Data",
    height: "340px",
    code: `const series = pulse([
  {
    label: "Group A",
    points: [
      { x: 1, y: 4 }, { x: 2, y: 6 }, { x: 3, y: 3 },
      { x: 4, y: 8 }, { x: 5, y: 5 }, { x: 6, y: 9 },
    ],
  },
  {
    label: "Group B",
    points: [
      { x: 1, y: 7 }, { x: 2, y: 3 }, { x: 3, y: 9 },
      { x: 4, y: 2 }, { x: 5, y: 8 }, { x: 6, y: 4 },
    ],
  },
]);

return (
  <div style="display:flex;align-items:center;justify-content:center">
    <ScatterPlot series={series} xLabel="X axis" yLabel="Y axis" width={580} height={300} />
  </div>
)`,
  },
  {
    id: "icons-—-common",
    name: "Icons — Common",
    tag: "30 icons",
    category: "Icons",
    height: "100px",
    code: `<span style="display:flex;gap:1rem;flex-wrap:wrap;">
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
  <IconTerminal size={24} />
  <IconCode size={24} />
  <IconPackage size={24} />
  <IconMenu size={24} />
  <IconLink size={24} />
  <IconExternalLink size={24} />
  <IconArrowRight size={24} />
  <IconChevronRight size={24} />
  <IconChevronDown size={24} />
  <IconPlay size={24} />
  <IconAim size={24} />
  <IconRoute size={24} />
  <IconCrossArrowsToRight size={24} />
  <IconTreeChart size={24} />
</span>`,
  },
  {
    id: "icons-—-other",
    name: "Icons — Other",
    tag: "7 icons",
    category: "Icons",
    code: `<span style="display:flex;gap:1rem;flex-wrap:wrap;">
  <IconGithub size={24} />
  <IconReact size={24} />
  <IconVue size={24} />
  <IconAngular size={24} />
  <IconTypeScript size={24} />
  <IconJavaScript size={24} />
  <IconPulse size={24} />
</span>`,
  },
];
