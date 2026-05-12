import { component, onCleanup, type BeatJsxChild } from "@ochairo/beat";
import { Decimal, Int } from "@ochairo/numbers";
import {
  Button,
  Card,
  IconPause,
  IconPlay,
  Sheet,
  Slider,
  Sparkline,
  type BeatUiState,
  type SheetColumnDefinition,
} from "@ochairo/beat-ui";
import { derived, pulse, type ReadonlyPulse } from "@ochairo/pulse";

import type { CoinMeta } from "../../../domain/types";
import css from "./CryptoDashboard.module.css";

// ── Helpers ──

function jitter(base: number, pct = 0.003): number {
  return base * (1 + (Math.random() - 0.5) * 2 * pct);
}

function fmt(price: number): string {
  if (price >= 10_000)
    return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (price >= 1)
    return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
}

function tone(pct: number): "success" | "danger" | "default" {
  if (pct > 0) return "success";
  if (pct < 0) return "danger";
  return "default";
}

function fmtCompact(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toFixed(0)}`;
}

function fmtSupply(value: number, symbol: string): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B ${symbol}`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M ${symbol}`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K ${symbol}`;
  return `${value.toFixed(0)} ${symbol}`;
}

function fmtPercentValue(value: number, fractionDigits = 2): string {
  return `${value.toFixed(fractionDigits)}%`;
}

function fmtSignedPercentValue(value: number, fractionDigits = 2): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(fractionDigits)}%`;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const normalized = Number(String(value));
  return Number.isFinite(normalized) ? normalized : 0;
}

// ── BTC chart builder ──
const BTC_W = 500;
const BTC_H = 170;
const BTC_PAD = { top: 24, right: 80, bottom: 24, left: 8 };

interface BtcPaths {
  line: string;
  area: string;
  currentY: number;
  athY: number;
  athVisible: boolean;
  maxLabel: string;
  minLabel: string;
  currentLabel: string;
}

type FlashDirection = "" | "up" | "down";

function buildBtcPaths(values: readonly number[], ath: number): BtcPaths {
  if (values.length < 2) {
    return {
      line: "",
      area: "",
      currentY: BTC_H / 2,
      athY: BTC_PAD.top,
      athVisible: false,
      maxLabel: "",
      minLabel: "",
      currentLabel: "",
    };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Domain based on data range only — generous padding so line uses full height
  const spread = Math.max((max - min) * 0.25, Math.abs(max) * 0.005, 1);
  const domMin = min - spread;
  const domMax = max + spread;
  const innerW = BTC_W - BTC_PAD.left - BTC_PAD.right;
  const innerH = BTC_H - BTC_PAD.top - BTC_PAD.bottom;
  const x = (i: number) => BTC_PAD.left + (i / (values.length - 1)) * innerW;
  const y = (v: number) =>
    BTC_PAD.top + (1 - (v - domMin) / (domMax - domMin)) * innerH;
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p}`).join(" ");
  const lastX = x(values.length - 1).toFixed(1);
  const firstX = x(0).toFixed(1);
  const baseY = (BTC_PAD.top + innerH).toFixed(1);
  const area = `${line} L${lastX},${baseY} L${firstX},${baseY} Z`;
  const athYRaw = y(ath);
  const athVisible = athYRaw >= BTC_PAD.top && athYRaw <= BTC_PAD.top + innerH;
  return {
    line,
    area,
    currentY: y(values[values.length - 1]!),
    athY: Math.max(BTC_PAD.top, Math.min(BTC_PAD.top + innerH, athYRaw)),
    athVisible,
    maxLabel: fmt(max),
    minLabel: fmt(min),
    currentLabel: fmt(values[values.length - 1]!),
  };
}

// ── Reactive coin state ──

interface CoinPulseState {
  readonly rank: unknown;
  readonly name: string;
  readonly symbol: string;
  readonly supply: unknown;
  readonly ath: unknown;
  readonly price: unknown;
  readonly history: string;
  readonly historyPoints: readonly number[];
  readonly change1h: unknown;
  readonly change24h: unknown;
  readonly change7d: unknown;
  readonly change30d: unknown;
  readonly flashClass: FlashDirection;
  readonly volume: unknown;
  readonly marketCap: unknown;
  readonly volMcap: unknown;
  readonly pctFromATH: unknown;
}

interface CoinState {
  meta: CoinMeta;
  rank: BeatUiState<unknown>;
  name: BeatUiState<string>;
  symbol: BeatUiState<string>;
  supply: BeatUiState<unknown>;
  ath: BeatUiState<unknown>;
  price: BeatUiState<unknown>;
  history: BeatUiState<string>;
  historyPoints: BeatUiState<readonly number[]>;
  change1h: BeatUiState<unknown>;
  change24h: BeatUiState<unknown>;
  change7d: BeatUiState<unknown>;
  change30d: BeatUiState<unknown>;
  flashClass: BeatUiState<FlashDirection>;
  volume: BeatUiState<unknown>;
  marketCap: BeatUiState<unknown>;
  volMcap: BeatUiState<unknown>;
  pctFromATH: BeatUiState<unknown>;
  sparklineColor: ReadonlyPulse<string>;
  beginBatchedUpdate: () => void;
  endBatchedUpdate: () => void;
  applySimulationTick: () => void;
}

function createIntegerValue(value: number): unknown {
  return Int(String(Math.round(value)));
}

function roundNumber(value: number, fractionDigits: number): number {
  return Number(value.toFixed(fractionDigits));
}

function createDecimalValue(value: number, fractionDigits: number): unknown {
  return Decimal(value.toFixed(fractionDigits));
}

function setDecimalState(
  state: BeatUiState<unknown>,
  value: number,
  fractionDigits: number,
): void {
  state.set(roundNumber(value, fractionDigits));
}

function formatHistorySeries(values: readonly number[]): string {
  return values.join(",");
}

function parseHistorySeries(value: string): readonly number[] {
  return value
    .split(/[\s,]+/)
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part));
}

function advanceHistorySeries(
  values: readonly number[],
  nextValue: number,
): readonly number[] {
  const length = values.length;
  if (length === 0) {
    return [nextValue];
  }

  const nextValues = new Array<number>(length);
  for (let index = 1; index < length; index += 1) {
    nextValues[index - 1] = values[index] ?? nextValue;
  }
  nextValues[length - 1] = nextValue;
  return nextValues;
}

function createInitialCoinPulseState(meta: CoinMeta): CoinPulseState {
  const initialHistory = Array.from({ length: 20 }, (_, i) =>
    jitter(meta.basePrice, 0.04 * ((20 - i) / 20)),
  );
  const roughMcap = 1.5e12 / Math.pow(meta.rank, 1.3);
  const initialAth = meta.basePrice * Math.min(1.1 + meta.rank * 0.12, 25);
  const initialChange1h = (Math.random() - 0.5) * 0.6;
  const initialChange24h = (Math.random() - 0.5) * 4;
  const initialChange7d = (Math.random() - 0.5) * 10;
  const initialChange30d = (Math.random() - 0.5) * 18;
  const initialVolume = roughMcap * (0.05 + Math.random() * 0.15);

  return {
    rank: createIntegerValue(meta.rank),
    name: meta.name,
    symbol: meta.symbol,
    supply: createIntegerValue(roughMcap / meta.basePrice),
    ath: createDecimalValue(initialAth, 4),
    price: roundNumber(meta.basePrice, 4),
    history: formatHistorySeries(initialHistory),
    historyPoints: initialHistory,
    change1h: roundNumber(initialChange1h, 2),
    change24h: roundNumber(initialChange24h, 2),
    change7d: roundNumber(initialChange7d, 2),
    change30d: roundNumber(initialChange30d, 2),
    flashClass: "",
    volume: Math.round(initialVolume),
    marketCap: roundNumber(roughMcap, 2),
    volMcap: roundNumber((initialVolume / roughMcap) * 100, 2),
    pctFromATH: roundNumber(
      ((meta.basePrice - initialAth) / initialAth) * 100,
      1,
    ),
  };
}

function makeCoinState(
  meta: CoinMeta,
  state: BeatUiState<CoinPulseState>,
  batch: <T>(callback: () => T) => T,
): CoinState {
  const rank: BeatUiState<unknown> = state.rank;
  const name: BeatUiState<string> = state.name;
  const symbol: BeatUiState<string> = state.symbol;
  const supply: BeatUiState<unknown> = state.supply;
  const ath: BeatUiState<unknown> = state.ath;
  const price: BeatUiState<unknown> = state.price;
  const history: BeatUiState<string> = state.history;
  const historyPoints: BeatUiState<readonly number[]> = state.historyPoints;
  const change1h: BeatUiState<unknown> = state.change1h;
  const change24h: BeatUiState<unknown> = state.change24h;
  const change7d: BeatUiState<unknown> = state.change7d;
  const change30d: BeatUiState<unknown> = state.change30d;
  const flashClass: BeatUiState<FlashDirection> = state.flashClass;
  const volume: BeatUiState<unknown> = state.volume;
  const marketCap: BeatUiState<unknown> = state.marketCap;
  const volMcap: BeatUiState<unknown> = state.volMcap;
  const pctFromATH: BeatUiState<unknown> = state.pctFromATH;
  const sparklineColor = derived(change7d, resolveSparklineColor);
  const coin: Omit<
    CoinState,
    "beginBatchedUpdate" | "endBatchedUpdate" | "applySimulationTick"
  > = {
    meta,
    rank,
    name,
    symbol,
    supply,
    ath,
    price,
    history,
    historyPoints,
    change1h,
    change24h,
    change7d,
    change30d,
    flashClass,
    volume,
    marketCap,
    volMcap,
    pctFromATH,
    sparklineColor,
  };

  let marketCapIsDerived = true;
  let volMcapIsDerived = true;
  let pctFromATHIsDerived = true;
  let batchingTickUpdate = false;
  let syncingDerivedState = false;
  let syncingHistoryState = false;

  const syncDerivedFields = (nextPrice: number, nextVolume: number): void => {
    const nextAth = toNumber(ath.get());
    const nextSupply = toNumber(supply.get());
    const nextComputedMarketCap = nextPrice * nextSupply;
    const marketCapBasis = marketCapIsDerived
      ? nextComputedMarketCap
      : toNumber(marketCap.get());

    if (marketCapIsDerived) {
      setDecimalState(marketCap, nextComputedMarketCap, 2);
    }

    if (volMcapIsDerived) {
      setDecimalState(
        volMcap,
        marketCapBasis === 0 ? 0 : (nextVolume / marketCapBasis) * 100,
        2,
      );
    }

    if (pctFromATHIsDerived) {
      setDecimalState(
        pctFromATH,
        nextAth === 0 ? 0 : ((nextPrice - nextAth) / nextAth) * 100,
        1,
      );
    }
  };

  const recompute = (): void => {
    syncingDerivedState = true;
    try {
      batch(() => {
        syncDerivedFields(toNumber(price.get()), toNumber(volume.get()));
      });
    } finally {
      syncingDerivedState = false;
    }
  };

  const syncHistoryPoints = (): void => {
    if (syncingHistoryState) {
      return;
    }

    historyPoints.set(parseHistorySeries(String(history.get())));
  };

  const requestRecompute = (): void => {
    if (batchingTickUpdate) {
      return;
    }

    recompute();
  };

  const beginBatchedUpdate = (): void => {
    batchingTickUpdate = true;
    syncingDerivedState = true;
    syncingHistoryState = true;
  };

  const endBatchedUpdate = (): void => {
    syncingHistoryState = false;
    syncingDerivedState = false;
    batchingTickUpdate = false;
  };

  const applySimulationTick = (): void => {
    const current = state.get();
    const previousPrice = toNumber(current.price);
    const nextPrice = jitter(previousPrice, 0.004);
    const nextHistory = advanceHistorySeries(current.historyPoints, nextPrice);
    const nextChange1h =
      toNumber(current.change1h) + (Math.random() - 0.5) * 0.04;
    const nextChange24h =
      toNumber(current.change24h) + (Math.random() - 0.5) * 0.1;
    const nextChange7d =
      toNumber(current.change7d) + (Math.random() - 0.5) * 0.05;
    const nextChange30d =
      toNumber(current.change30d) + (Math.random() - 0.5) * 0.15;
    const nextFlashClass: FlashDirection =
      nextPrice >= previousPrice ? "up" : "down";
    const nextVolume = jitter(toNumber(current.volume), 0.02);
    const nextAth = toNumber(current.ath);
    const nextSupply = toNumber(current.supply);
    const nextComputedMarketCap = nextPrice * nextSupply;
    const marketCapBasis = marketCapIsDerived
      ? nextComputedMarketCap
      : toNumber(current.marketCap);

    state.set({
      ...current,
      price: roundNumber(nextPrice, 4),
      history: formatHistorySeries(nextHistory),
      historyPoints: nextHistory,
      change1h: roundNumber(nextChange1h, 2),
      change24h: roundNumber(nextChange24h, 2),
      change7d: roundNumber(nextChange7d, 2),
      change30d: roundNumber(nextChange30d, 2),
      flashClass: nextFlashClass,
      volume: Math.round(nextVolume),
      marketCap: marketCapIsDerived
        ? roundNumber(nextComputedMarketCap, 2)
        : current.marketCap,
      volMcap: volMcapIsDerived
        ? roundNumber(
            marketCapBasis === 0 ? 0 : (nextVolume / marketCapBasis) * 100,
            2,
          )
        : current.volMcap,
      pctFromATH: pctFromATHIsDerived
        ? roundNumber(
            nextAth === 0 ? 0 : ((nextPrice - nextAth) / nextAth) * 100,
            1,
          )
        : current.pctFromATH,
    });
  };

  const disposers = [
    price.on(requestRecompute),
    supply.on(requestRecompute),
    volume.on(requestRecompute),
    ath.on(requestRecompute),
    history.on(syncHistoryPoints),
    marketCap.on(() => {
      if (!syncingDerivedState) {
        marketCapIsDerived = false;
      }
    }),
    volMcap.on(() => {
      if (!syncingDerivedState) {
        volMcapIsDerived = false;
      }
    }),
    pctFromATH.on(() => {
      if (!syncingDerivedState) {
        pctFromATHIsDerived = false;
      }
    }),
  ];

  onCleanup(() => {
    for (const dispose of disposers) {
      dispose();
    }
  });

  recompute();

  return {
    ...coin,
    beginBatchedUpdate,
    endBatchedUpdate,
    applySimulationTick,
  };
}

function renderCoinAsset(row: CoinState): BeatJsxChild {
  return (
    <div class={css["coinName"]!}>
      <div class={css["coinInitial"]!}>{row.symbol.get()[0]}</div>
      <div>
        <div class={css["coinTitle"]!} text={row.name} />
        <div class={css["coinSymbol"]!} text={row.symbol} />
      </div>
    </div>
  );
}

type CryptoTableColumnId =
  | "rank"
  | "asset"
  | "price"
  | "change1h"
  | "change24h"
  | "change7d"
  | "change30d"
  | "marketCap"
  | "volume24h"
  | "volMcap"
  | "supply"
  | "ath"
  | "pctFromATH"
  | "history";

function isRightAlignedColumnId(columnId: CryptoTableColumnId): boolean {
  return columnId !== "rank" && columnId !== "asset";
}

type DeltaTone = ReturnType<typeof tone>;

const DELTA_BADGE_SUCCESS_CLASS = `${css["deltaBadge"]!} ${css["deltaBadgeSuccess"]!}`;
const DELTA_BADGE_DANGER_CLASS = `${css["deltaBadge"]!} ${css["deltaBadgeDanger"]!}`;
const DELTA_BADGE_DEFAULT_CLASS = `${css["deltaBadge"]!} ${css["deltaBadgeDefault"]!}`;
const PRICE_BASE_CLASS = css["price"]!;
const PRICE_UP_CLASS = `${css["price"]!} ${css["flashPriceUp"]!}`;
const PRICE_DOWN_CLASS = `${css["price"]!} ${css["flashPriceDown"]!}`;

function resolveDeltaBadgeClass(toneValue: DeltaTone): string {
  switch (toneValue) {
    case "success":
      return DELTA_BADGE_SUCCESS_CLASS;
    case "danger":
      return DELTA_BADGE_DANGER_CLASS;
    default:
      return DELTA_BADGE_DEFAULT_CLASS;
  }
}

function resolvePriceClass(flashClass: FlashDirection): string {
  if (flashClass === "up") {
    return PRICE_UP_CLASS;
  }

  if (flashClass === "down") {
    return PRICE_DOWN_CLASS;
  }

  return PRICE_BASE_CLASS;
}

function resolveSparklineColor(change: unknown): string {
  return toNumber(change) >= 0
    ? "var(--beat-ui-color-success)"
    : "var(--beat-ui-color-danger)";
}

function renderDeltaBadge(value: unknown): BeatJsxChild {
  const numericValue = toNumber(value);

  return (
    <span class={resolveDeltaBadgeClass(tone(numericValue))}>
      <span>{fmtSignedPercentValue(numericValue)}</span>
    </span>
  );
}

const CRYPTO_TABLE_COLUMNS: readonly SheetColumnDefinition<CoinState>[] = [
  {
    id: "rank",
    title: "#",
    width: "3%",
    align: "right",
    dataType: "integer",
    editable: true,
    getValueState: (row) => row.rank,
    renderValue: (value) => <span class={css["rank"]!}>{toNumber(value)}</span>,
  },
  {
    id: "asset",
    title: "Name",
    width: "15%",
    dataType: "text",
    editable: true,
    getValueState: (row) => row.name as BeatUiState<unknown>,
    renderValue: (_value, row) => renderCoinAsset(row),
  },
  {
    id: "price",
    title: "Price",
    width: "8%",
    align: "right",
    dataType: "decimal(18,4)",
    editable: true,
    getValueState: (row) => row.price,
    renderValue: (value, row) => (
      <span class={resolvePriceClass(row.flashClass.get())}>
        {fmt(toNumber(value))}
      </span>
    ),
  },
  {
    id: "change1h",
    title: "1h %",
    width: "5%",
    align: "right",
    dataType: "decimal(8,2)",
    editable: true,
    getValueState: (row) => row.change1h,
    renderValue: (value) => renderDeltaBadge(value),
  },
  {
    id: "change24h",
    title: "24h %",
    width: "5%",
    align: "right",
    dataType: "decimal(8,2)",
    editable: true,
    getValueState: (row) => row.change24h,
    renderValue: (value) => renderDeltaBadge(value),
  },
  {
    id: "change7d",
    title: "7d %",
    width: "5%",
    align: "right",
    dataType: "decimal(8,2)",
    editable: true,
    getValueState: (row) => row.change7d,
    renderValue: (value) => renderDeltaBadge(value),
  },
  {
    id: "change30d",
    title: "30d %",
    width: "5%",
    align: "right",
    dataType: "decimal(8,2)",
    editable: true,
    getValueState: (row) => row.change30d,
    renderValue: (value) => renderDeltaBadge(value),
  },
  {
    id: "marketCap",
    title: "Market Cap",
    width: "8%",
    align: "right",
    dataType: "decimal(18,2)",
    editable: true,
    getValueState: (row) => row.marketCap,
    renderValue: (value) => (
      <span class={css["price"]!}>{fmtCompact(toNumber(value))}</span>
    ),
  },
  {
    id: "volume24h",
    title: "Volume (24h)",
    width: "8%",
    align: "right",
    dataType: "integer",
    editable: true,
    getValueState: (row) => row.volume,
    renderValue: (value) => (
      <span class={css["muted"]!}>{fmtCompact(toNumber(value))}</span>
    ),
  },
  {
    id: "volMcap",
    title: "Vol/MCap",
    width: "6%",
    align: "right",
    dataType: "decimal(8,2)",
    editable: true,
    getValueState: (row) => row.volMcap,
    renderValue: (value) => (
      <span class={css["muted"]!}>{fmtPercentValue(toNumber(value))}</span>
    ),
  },
  {
    id: "supply",
    title: "Circ. Supply",
    width: "10%",
    align: "right",
    dataType: "integer",
    editable: true,
    getValueState: (row) => row.supply,
    renderValue: (value, row) => (
      <span class={css["muted"]!}>
        {fmtSupply(toNumber(value), row.meta.symbol)}
      </span>
    ),
  },
  {
    id: "ath",
    title: "ATH",
    width: "8%",
    align: "right",
    dataType: "decimal(18,4)",
    editable: true,
    getValueState: (row) => row.ath,
    renderValue: (value) => (
      <span class={css["muted"]!}>{fmt(toNumber(value))}</span>
    ),
  },
  {
    id: "pctFromATH",
    title: "% from ATH",
    width: "6%",
    align: "right",
    dataType: "decimal(8,1)",
    editable: true,
    getValueState: (row) => row.pctFromATH,
    renderValue: (value) => (
      <span class={`${css["deltaBadge"]!} ${css["deltaBadgeDanger"]!}`}>
        <span>{fmtPercentValue(toNumber(value), 1)}</span>
      </span>
    ),
  },
  {
    id: "history",
    title: "Last 7 Days",
    width: "8%",
    align: "right",
    dataType: "text",
    editable: true,
    getValueState: (row) => row.history as BeatUiState<unknown>,
    renderValue: (_value, row) => (
      <Sparkline
        values={row.historyPoints}
        height={32}
        stroke={row.sparklineColor}
      />
    ),
  },
];

// ── Component ──

export interface CryptoDashboardProps {
  readonly coins: readonly CoinMeta[];
}

export const CryptoDashboard = component<CryptoDashboardProps>(
  (props): BeatJsxChild => {
    const coinStore = pulse<Record<string, CoinPulseState>>(
      Object.fromEntries(
        props.coins.map((meta) => [
          meta.symbol,
          createInitialCoinPulseState(meta),
        ]),
      ),
    );
    const coins = props.coins.map((meta) =>
      makeCoinState(meta, coinStore.prop(meta.symbol), (callback) =>
        coinStore.batch(callback),
      ),
    );

    // ── BTC featured chart ──
    const btc = coins[0]!;
    const btcHistorySize = 120;
    const btcChartHistory = pulse<readonly number[]>(
      Array.from({ length: btcHistorySize }, (_, i) =>
        jitter(
          btc.meta.basePrice,
          0.04 * ((btcHistorySize - i) / btcHistorySize),
        ),
      ),
    );
    const btcChartColor = pulse("var(--beat-ui-color-success)");
    onCleanup(
      btc.flashClass.on(({ currentValue }) => {
        btcChartColor.set(
          currentValue === "up"
            ? "var(--beat-ui-color-success)"
            : "var(--beat-ui-color-danger)",
        );
      }),
    );

    const marketCap = pulse(2.66e12);
    const volume24h = pulse(133.7e9);
    const fearGreed = pulse(47);
    const btcDominance = pulse(60.2);
    const derivativesVol = pulse(87e9);
    const totalExchanges = pulse(642);

    // ── Simulation controls ──
    const intervalMs = pulse(500);
    const paused = pulse(false);
    const ticksPerSec = pulse(0);
    const tickTimestamps: number[] = [];

    function tick(): void {
      const now = Date.now();
      tickTimestamps.push(now);
      const cutoff = now - 1000;
      while (tickTimestamps.length > 0 && tickTimestamps[0]! < cutoff) {
        tickTimestamps.shift();
      }
      ticksPerSec.set(tickTimestamps.length);

      for (const coin of coins) {
        coin.beginBatchedUpdate();
      }

      try {
        coinStore.batch(() => {
          for (const coin of coins) {
            coin.applySimulationTick();
          }
        });
      } finally {
        for (const coin of coins) {
          coin.endBatchedUpdate();
        }
      }

      btcChartHistory.set([
        ...btcChartHistory.get().slice(1),
        toNumber(btc.price.get()),
      ]);

      marketCap.set(jitter(marketCap.get(), 0.002));
      volume24h.set(jitter(volume24h.get(), 0.005));
      fearGreed.set(
        Math.min(100, Math.max(0, fearGreed.get() + (Math.random() - 0.5))),
      );
      btcDominance.set(
        Math.min(
          100,
          Math.max(0, btcDominance.get() + (Math.random() - 0.5) * 0.02),
        ),
      );
      derivativesVol.set(jitter(derivativesVol.get(), 0.008));
      totalExchanges.set(
        Math.max(
          600,
          Math.round(
            totalExchanges.get() +
              (Math.random() > 0.98 ? 1 : Math.random() < 0.02 ? -1 : 0),
          ),
        ),
      );
    }

    let intervalId: ReturnType<typeof setInterval> | null = null;

    function startInterval(): void {
      if (intervalId !== null) clearInterval(intervalId);
      intervalId = setInterval(tick, intervalMs.get());
    }

    startInterval();

    onCleanup(
      intervalMs.on(() => {
        if (!paused.get()) startInterval();
      }),
    );

    onCleanup(
      paused.on(({ currentValue }) => {
        if (currentValue) {
          if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
          }
          ticksPerSec.set(0);
          tickTimestamps.splice(0, tickTimestamps.length);
        } else {
          startInterval();
        }
      }),
    );

    onCleanup(() => {
      if (intervalId !== null) clearInterval(intervalId);
    });

    // ── Derived display ──
    const marketCapDisplay = derived(
      marketCap,
      (v) => `$${(v / 1e12).toFixed(2)}T`,
    );
    const volumeDisplay = derived(
      volume24h,
      (v) => `$${(v / 1e9).toFixed(1)}B`,
    );
    const fearGreedDisplay = derived(fearGreed, (v) => `${Math.round(v)}`);
    const btcDomDisplay = derived(btcDominance, (v) => `${v.toFixed(1)}%`);
    const derivativesDisplay = derived(derivativesVol, (v) => fmtCompact(v));
    const exchangesDisplay = derived(totalExchanges, (v) => String(v));

    // Direction tracking for stat cards
    const mcapDir = pulse("");
    const volDir = pulse("");
    const fgDir = pulse("");
    const btcDir = pulse("");
    const derivDir = pulse("");
    const exchDir = pulse("");
    onCleanup(
      marketCap.on(({ previousValue, currentValue }) => {
        mcapDir.set(
          currentValue >= previousValue ? css["statUp"]! : css["statDown"]!,
        );
      }),
    );
    onCleanup(
      volume24h.on(({ previousValue, currentValue }) => {
        volDir.set(
          currentValue >= previousValue ? css["statUp"]! : css["statDown"]!,
        );
      }),
    );
    onCleanup(
      fearGreed.on(({ previousValue, currentValue }) => {
        fgDir.set(
          currentValue >= previousValue ? css["statUp"]! : css["statDown"]!,
        );
      }),
    );
    onCleanup(
      btcDominance.on(({ previousValue, currentValue }) => {
        btcDir.set(
          currentValue >= previousValue ? css["statUp"]! : css["statDown"]!,
        );
      }),
    );
    onCleanup(
      derivativesVol.on(({ previousValue, currentValue }) => {
        derivDir.set(
          currentValue >= previousValue ? css["statUp"]! : css["statDown"]!,
        );
      }),
    );
    onCleanup(
      totalExchanges.on(({ previousValue, currentValue }) => {
        exchDir.set(
          currentValue >= previousValue ? css["statUp"]! : css["statDown"]!,
        );
      }),
    );

    const speedLabel = derived(intervalMs, (v) => `${v}ms`);

    // BTC chart derived paths
    const btcPaths = pulse<BtcPaths>(
      buildBtcPaths(btcChartHistory.get(), toNumber(btc.ath.get())),
    );
    onCleanup(
      btcChartHistory.on(({ currentValue }) => {
        btcPaths.set(buildBtcPaths(currentValue, toNumber(btc.ath.get())));
      }),
    );
    const btcLinePath = derived(btcPaths, (p) => p.line);
    const btcAreaPath = derived(btcPaths, (p) => p.area);
    const btcCurrentY = derived(btcPaths, (p) => String(p.currentY.toFixed(1)));
    const btcAthY = derived(btcPaths, (p) => String(p.athY.toFixed(1)));
    const btcAthVisible = derived(btcPaths, (p) => p.athVisible);
    const btcMaxLabel = derived(btcPaths, (p) => p.maxLabel);
    const btcMinLabel = derived(btcPaths, (p) => p.minLabel);
    const btcCurrentLabel = derived(btcPaths, (p) => p.currentLabel);
    const btcAthLabel = fmt(toNumber(btc.ath.get()));
    const btcGradientId = `btcGrad-${Math.random().toString(36).slice(2)}`;

    return (
      <div class={css["root"]!}>
        <div class={css["topRow"]!}>
          <div class={css["statColumn"]!}>
            <div class={css["statGrid"]!}>
              <Card padding="sm" radius="md" style="grid-column:1 / -1">
                <div class={css["guideCard"]!}>
                  <div class={css["guideCopy"]!}>
                    <div class={css["statLabel"]!}>What You Can Do Here</div>
                    <div class={css["guideTitle"]!}>
                      Work with the crypto table like a live spreadsheet.
                    </div>
                    <p class={css["guideText"]!}>
                      Edit values inline, paste from Excel or Google Sheets,
                      copy selected ranges, and pause or speed up the live feed.
                    </p>
                  </div>
                </div>
              </Card>
              <Card padding="sm" radius="md">
                <div class={css["statLabel"]!}>Global Market Cap</div>
                <div
                  class={css["statValue"]!}
                  text={marketCapDisplay}
                  ref={(el) => {
                    const div = el as HTMLDivElement;
                    onCleanup(
                      mcapDir.on(({ currentValue }) => {
                        div.className = `${css["statValue"]!}${currentValue ? ` ${currentValue}` : ""}`;
                      }),
                    );
                  }}
                />
              </Card>
              <Card padding="sm" radius="md">
                <div class={css["statLabel"]!}>24h Volume</div>
                <div
                  class={css["statValue"]!}
                  text={volumeDisplay}
                  ref={(el) => {
                    const div = el as HTMLDivElement;
                    onCleanup(
                      volDir.on(({ currentValue }) => {
                        div.className = `${css["statValue"]!}${currentValue ? ` ${currentValue}` : ""}`;
                      }),
                    );
                  }}
                />
              </Card>
              <Card padding="sm" radius="md">
                <div class={css["statLabel"]!}>Fear & Greed</div>
                <div
                  class={css["statValue"]!}
                  text={fearGreedDisplay}
                  ref={(el) => {
                    const div = el as HTMLDivElement;
                    onCleanup(
                      fgDir.on(({ currentValue }) => {
                        div.className = `${css["statValue"]!}${currentValue ? ` ${currentValue}` : ""}`;
                      }),
                    );
                  }}
                />
                <span class={css["statSub"]!}>Neutral</span>
              </Card>
              <Card padding="sm" radius="md">
                <div class={css["statLabel"]!}>BTC Dominance</div>
                <div
                  class={css["statValue"]!}
                  text={btcDomDisplay}
                  ref={(el) => {
                    const div = el as HTMLDivElement;
                    onCleanup(
                      btcDir.on(({ currentValue }) => {
                        div.className = `${css["statValue"]!}${currentValue ? ` ${currentValue}` : ""}`;
                      }),
                    );
                  }}
                />
              </Card>
              <Card padding="sm" radius="md">
                <div class={css["statLabel"]!}>Derivatives Vol</div>
                <div
                  class={css["statValue"]!}
                  text={derivativesDisplay}
                  ref={(el) => {
                    const div = el as HTMLDivElement;
                    onCleanup(
                      derivDir.on(({ currentValue }) => {
                        div.className = `${css["statValue"]!}${currentValue ? ` ${currentValue}` : ""}`;
                      }),
                    );
                  }}
                />
              </Card>
              <Card padding="sm" radius="md">
                <div class={css["statLabel"]!}>Exchanges</div>
                <div
                  class={css["statValue"]!}
                  text={exchangesDisplay}
                  ref={(el) => {
                    const div = el as HTMLDivElement;
                    onCleanup(
                      exchDir.on(({ currentValue }) => {
                        div.className = `${css["statValue"]!}${currentValue ? ` ${currentValue}` : ""}`;
                      }),
                    );
                  }}
                />
              </Card>
              <div class={css["sliderRow"]!}>
                <Button
                  appearance="ghost"
                  onPress={() => {
                    paused.set(!paused.get());
                  }}
                >
                  <span
                    ref={(el) => {
                      onCleanup(
                        paused.on(({ currentValue }) => {
                          (el as HTMLElement).hidden = currentValue;
                        }),
                      );
                    }}
                  >
                    <IconPause />
                  </span>
                  <span
                    hidden
                    ref={(el) => {
                      onCleanup(
                        paused.on(({ currentValue }) => {
                          (el as HTMLElement).hidden = !currentValue;
                        }),
                      );
                    }}
                  >
                    <IconPlay />
                  </span>
                </Button>
                <div class={css["sliderGroup"]!}>
                  <span class={css["sliderLabel"]!}>Speed</span>
                  <Slider
                    min={50}
                    max={2000}
                    step={50}
                    value={intervalMs}
                    onValueChange={(v) => {
                      intervalMs.set(v);
                    }}
                  />
                  <span class={css["sliderValue"]!} text={speedLabel} />
                </div>
              </div>
            </div>
          </div>
          {/* statColumn */}

          {/* BTC featured chart + controls */}
          <div class={css["btcColumn"]!}>
            <Card
              padding="none"
              radius="lg"
              style="overflow:hidden;min-width:0;display:flex;flex-direction:column"
            >
              <div class={css["btcChartHeader"]!}>
                <div class={css["btcChartTitle"]!}>
                  <div class={css["coinInitial"]!}>B</div>
                  <span>Bitcoin</span>
                  <span class={css["coinSymbol"]!}>BTC</span>
                </div>
                <div
                  class={css["btcCurrentPrice"]!}
                  text={btcCurrentLabel}
                  ref={(el) => {
                    const div = el as HTMLDivElement;
                    onCleanup(
                      btcChartColor.on(({ currentValue }) => {
                        (div as HTMLElement).style.color = currentValue;
                      }),
                    );
                  }}
                />
              </div>
              <svg
                viewBox={`0 0 ${BTC_W} ${BTC_H}`}
                width="100%"
                preserveAspectRatio="xMidYMid meet"
                class={css["btcChartSvg"]!}
                aria-hidden="true"
              >
                <defs>
                  <linearGradient
                    id={btcGradientId}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stop-color={btcChartColor}
                      stop-opacity="0.35"
                    />
                    <stop
                      offset="100%"
                      stop-color={btcChartColor}
                      stop-opacity="0.02"
                    />
                  </linearGradient>
                </defs>
                {/* Subtle horizontal grid lines */}
                <line
                  x1={String(BTC_PAD.left)}
                  y1={String(BTC_PAD.top)}
                  x2={String(BTC_W - BTC_PAD.right)}
                  y2={String(BTC_PAD.top)}
                  class={css["btcGrid"]!}
                />
                <line
                  x1={String(BTC_PAD.left)}
                  y1={String(BTC_H / 2)}
                  x2={String(BTC_W - BTC_PAD.right)}
                  y2={String(BTC_H / 2)}
                  class={css["btcGrid"]!}
                />
                <line
                  x1={String(BTC_PAD.left)}
                  y1={String(BTC_H - BTC_PAD.bottom)}
                  x2={String(BTC_W - BTC_PAD.right)}
                  y2={String(BTC_H - BTC_PAD.bottom)}
                  class={css["btcGrid"]!}
                />
                {/* ATH dotted line */}
                <line
                  x1={String(BTC_PAD.left)}
                  x2={String(BTC_W - BTC_PAD.right)}
                  class={css["btcAthLine"]!}
                  ref={(el) => {
                    const line = el as SVGLineElement;
                    onCleanup(
                      btcAthY.on(({ currentValue }) => {
                        line.setAttribute("y1", currentValue);
                        line.setAttribute("y2", currentValue);
                      }),
                    );
                    onCleanup(
                      btcAthVisible.on(({ currentValue }) => {
                        line.style.display = currentValue ? "" : "none";
                      }),
                    );
                  }}
                />
                {/* ATH label */}
                <text
                  x={String(BTC_W - BTC_PAD.right + 4)}
                  class={css["btcAxisLabel"]!}
                  ref={(el) => {
                    const t = el as SVGTextElement;
                    onCleanup(
                      btcAthY.on(({ currentValue }) => {
                        t.setAttribute("y", String(Number(currentValue) + 4));
                      }),
                    );
                    onCleanup(
                      btcAthVisible.on(({ currentValue }) => {
                        t.style.display = currentValue ? "" : "none";
                      }),
                    );
                  }}
                >
                  {btcAthLabel}
                </text>
                {/* Area fill */}
                <path
                  fill={`url(#${btcGradientId})`}
                  stroke="none"
                  ref={(el) => {
                    const path = el as SVGPathElement;
                    onCleanup(
                      btcAreaPath.on(({ currentValue }) => {
                        path.setAttribute("d", currentValue);
                      }),
                    );
                  }}
                />
                {/* Line */}
                <path
                  fill="none"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke={btcChartColor}
                  ref={(el) => {
                    const path = el as SVGPathElement;
                    onCleanup(
                      btcLinePath.on(({ currentValue }) => {
                        path.setAttribute("d", currentValue);
                      }),
                    );
                  }}
                />
                {/* Y-axis max label */}
                <text
                  x={String(BTC_W - BTC_PAD.right + 4)}
                  y={String(BTC_PAD.top + 4)}
                  class={css["btcAxisLabel"]!}
                  text={btcMaxLabel}
                />
                {/* Y-axis min label */}
                <text
                  x={String(BTC_W - BTC_PAD.right + 4)}
                  y={String(BTC_H - BTC_PAD.bottom)}
                  class={css["btcAxisLabel"]!}
                  text={btcMinLabel}
                />
                {/* Current price pill */}
                <rect
                  width="70"
                  height="16"
                  rx="3"
                  x={String(BTC_W - BTC_PAD.right + 4)}
                  fill={btcChartColor}
                  ref={(el) => {
                    const rect = el as SVGRectElement;
                    onCleanup(
                      btcCurrentY.on(({ currentValue }) => {
                        rect.setAttribute(
                          "y",
                          String(Number(currentValue) - 8),
                        );
                      }),
                    );
                  }}
                />
                <text
                  x={String(BTC_W - BTC_PAD.right + 39)}
                  fill="#fff"
                  font-size="9"
                  font-weight="700"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  text={btcCurrentLabel}
                  ref={(el) => {
                    const t = el as SVGTextElement;
                    onCleanup(
                      btcCurrentY.on(({ currentValue }) => {
                        t.setAttribute("y", currentValue);
                      }),
                    );
                  }}
                />
              </svg>
            </Card>
          </div>
          {/* btcColumn */}
        </div>
        {/* topRow */}

        <Card
          class={css["sheetCard"]!}
          padding="none"
          radius="lg"
          style="display:flex;flex-direction:column;flex:1 1 0;min-height:0;overflow:hidden;background:var(--beat-ui-color-background-elevated)"
        >
          <div class={css["sheetArea"]!}>
            <Sheet
              ariaLabel="Cryptocurrency prices by market cap"
              class={css["sheet"]!}
              classNames={{
                frame: css["sheetFrame"]!,
                viewport: css["sheetViewport"]!,
                root: css["sheetRoot"]!,
                header: css["sheetHeader"]!,
                row: css["sheetRow"]!,
                headerRow: css["sheetHeaderRow"]!,
                bodyRow: css["sheetBodyRow"]!,
                headerCell: css["sheetHeaderCell"]!,
                cell: css["sheetCell"]!,
                stickyHeaderCell: css["sheetStickyHeaderCell"]!,
              }}
              columns={CRYPTO_TABLE_COLUMNS}
              editValueBehavior="sync-until-dirty"
              getHeaderCellProps={({ columnId }) => {
                const resolvedColumnId = columnId as CryptoTableColumnId;
                return isRightAlignedColumnId(resolvedColumnId)
                  ? { class: css["right"]! }
                  : undefined;
              }}
              getRowId={(row) => row.symbol.get()}
              height="100%"
              rowVirtualizationOverscan={64}
              rowVirtualizationRootMargin="480px 0px 480px 0px"
              rows={coins}
              styles={{
                frame:
                  "--beat-ui-sheet-sticky-header-background:var(--beat-ui-color-background);border:none;border-radius:0;background:transparent",
                viewport:
                  "background:var(--beat-ui-color-background-elevated);overflow-x:hidden;overflow-y:auto",
                root: "width:100%;min-width:100%;background:var(--beat-ui-color-background-elevated)",
                row: "width:100%;min-width:100%",
                headerCell: "min-width:0",
                cell: "--beat-ui-sheet-cell-background:var(--beat-ui-color-background-elevated);--beat-ui-sheet-cell-selected-background:var(--beat-ui-color-background-accent-soft);min-width:0",
              }}
              virtualizeRows
            />
          </div>
        </Card>
      </div>
    );
  },
);
