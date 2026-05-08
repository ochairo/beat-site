import { component, onCleanup, type BeatJsxChild } from "@ochairo/beat";
import {
  Badge,
  Button,
  Card,
  IconPause,
  IconPlay,
  Slider,
  Sparkline,
} from "@ochairo/beat-ui";
import { derived, pulse } from "@ochairo/pulse";

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

function fmtChange(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${(pct * 100).toFixed(2)}%`;
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

function fmtPctFromATH(price: number, ath: number): string {
  const pct = ((price - ath) / ath) * 100;
  return `${pct.toFixed(1)}%`;
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

interface CoinState {
  meta: CoinMeta;
  supply: number;
  ath: number;
  price: ReturnType<typeof pulse<number>>;
  history: ReturnType<typeof pulse<readonly number[]>>;
  change1h: ReturnType<typeof pulse<number>>;
  change24h: ReturnType<typeof pulse<number>>;
  change7d: ReturnType<typeof pulse<number>>;
  flashClass: ReturnType<typeof pulse<string>>;
  volume: ReturnType<typeof pulse<number>>;
}

function makeCoinState(meta: CoinMeta): CoinState {
  const initialHistory = Array.from({ length: 20 }, (_, i) =>
    jitter(meta.basePrice, 0.04 * ((20 - i) / 20)),
  );
  // Rough market-cap estimate via power-law decay; used for supply + volume seed
  const roughMcap = 1.5e12 / Math.pow(meta.rank, 1.3);
  const supply = roughMcap / meta.basePrice;
  const ath = meta.basePrice * Math.min(1.1 + meta.rank * 0.12, 25);
  return {
    meta,
    supply,
    ath,
    price: pulse(meta.basePrice),
    history: pulse<readonly number[]>(initialHistory),
    change1h: pulse((Math.random() - 0.5) * 0.006),
    change24h: pulse((Math.random() - 0.5) * 0.04),
    change7d: pulse((Math.random() - 0.5) * 0.1),
    flashClass: pulse(""),
    volume: pulse(roughMcap * (0.05 + Math.random() * 0.15)),
  };
}

// ── Component ──

export interface CryptoDashboardProps {
  readonly coins: readonly CoinMeta[];
}

export const CryptoDashboard = component<CryptoDashboardProps>(
  (props): BeatJsxChild => {
    const coins = props.coins.map(makeCoinState);

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
          currentValue === css["flashUp"]!
            ? "var(--beat-ui-color-success)"
            : "var(--beat-ui-color-danger)",
        );
      }),
    );

    const marketCap = pulse(2.66e12);
    const volume24h = pulse(133.7e9);
    const fearGreed = pulse(47);
    const btcDominance = pulse(60.2);
    const ethDominance = pulse(9.8);
    const defiCap = pulse(118e9);
    const stablecoinMcap = pulse(212e9);
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
        const prev = coin.price.get();
        const next = jitter(prev, 0.004);
        const fc = next >= prev ? css["flashUp"]! : css["flashDown"]!;
        coin.price.set(next);
        coin.history.set([...coin.history.get().slice(1), next]);
        coin.change1h.set(coin.change1h.get() + (Math.random() - 0.5) * 0.0004);
        coin.change24h.set(
          coin.change24h.get() + (Math.random() - 0.5) * 0.001,
        );
        coin.change7d.set(coin.change7d.get() + (Math.random() - 0.5) * 0.0005);
        coin.flashClass.set(fc);
        coin.volume.set(jitter(coin.volume.get(), 0.02));
      }

      btcChartHistory.set([
        ...btcChartHistory.get().slice(1),
        coins[0]!.price.get(),
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
      ethDominance.set(
        Math.min(
          100,
          Math.max(0, ethDominance.get() + (Math.random() - 0.5) * 0.01),
        ),
      );
      defiCap.set(jitter(defiCap.get(), 0.003));
      stablecoinMcap.set(jitter(stablecoinMcap.get(), 0.001));
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
    const ethDomDisplay = derived(ethDominance, (v) => `${v.toFixed(1)}%`);
    const defiCapDisplay = derived(defiCap, (v) => fmtCompact(v));
    const stablecoinDisplay = derived(stablecoinMcap, (v) => fmtCompact(v));
    const derivativesDisplay = derived(derivativesVol, (v) => fmtCompact(v));
    const exchangesDisplay = derived(totalExchanges, (v) => String(v));

    // Direction tracking for stat cards
    const mcapDir = pulse("");
    const volDir = pulse("");
    const fgDir = pulse("");
    const btcDir = pulse("");
    const ethDir = pulse("");
    const defiDir = pulse("");
    const stableDir = pulse("");
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
      ethDominance.on(({ previousValue, currentValue }) => {
        ethDir.set(
          currentValue >= previousValue ? css["statUp"]! : css["statDown"]!,
        );
      }),
    );
    onCleanup(
      defiCap.on(({ previousValue, currentValue }) => {
        defiDir.set(
          currentValue >= previousValue ? css["statUp"]! : css["statDown"]!,
        );
      }),
    );
    onCleanup(
      stablecoinMcap.on(({ previousValue, currentValue }) => {
        stableDir.set(
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
      buildBtcPaths(btcChartHistory.get(), btc.ath),
    );
    onCleanup(
      btcChartHistory.on(({ currentValue }) => {
        btcPaths.set(buildBtcPaths(currentValue, btc.ath));
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
    const btcAthLabel = fmt(btc.ath);
    const btcGradientId = `btcGrad-${Math.random().toString(36).slice(2)}`;

    return (
      <div class={css["root"]!}>
        <div class={css["topRow"]!}>
          <div class={css["statColumn"]!}>
            <div class={css["statGrid"]!}>
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
                <div class={css["statLabel"]!}>Active Cryptos</div>
                <div class={css["statValue"]!}>50.24M</div>
                <span class={css["statSub"]!}>Networks</span>
              </Card>
              <Card padding="sm" radius="md">
                <div class={css["statLabel"]!}>ETH Dominance</div>
                <div
                  class={css["statValue"]!}
                  text={ethDomDisplay}
                  ref={(el) => {
                    const div = el as HTMLDivElement;
                    onCleanup(
                      ethDir.on(({ currentValue }) => {
                        div.className = `${css["statValue"]!}${currentValue ? ` ${currentValue}` : ""}`;
                      }),
                    );
                  }}
                />
              </Card>
              <Card padding="sm" radius="md">
                <div class={css["statLabel"]!}>DeFi Cap</div>
                <div
                  class={css["statValue"]!}
                  text={defiCapDisplay}
                  ref={(el) => {
                    const div = el as HTMLDivElement;
                    onCleanup(
                      defiDir.on(({ currentValue }) => {
                        div.className = `${css["statValue"]!}${currentValue ? ` ${currentValue}` : ""}`;
                      }),
                    );
                  }}
                />
              </Card>
              <Card padding="sm" radius="md">
                <div class={css["statLabel"]!}>Stablecoin MCap</div>
                <div
                  class={css["statValue"]!}
                  text={stablecoinDisplay}
                  ref={(el) => {
                    const div = el as HTMLDivElement;
                    onCleanup(
                      stableDir.on(({ currentValue }) => {
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

        <Card padding="none" radius="lg" style="overflow:hidden">
          <div class={css["tableWrapper"]!}>
            <table class={css["table"]!}>
              <colgroup>
                <col style="width:48px" />
                <col style="width:200px" />
                <col style="width:110px" />
                <col style="width:80px" />
                <col style="width:80px" />
                <col style="width:80px" />
                <col style="width:110px" />
                <col style="width:110px" />
                <col style="width:90px" />
                <col style="width:130px" />
                <col style="width:90px" />
                <col style="width:110px" />
              </colgroup>
              <thead>
                <tr>
                  <th class={css["th"]!}>#</th>
                  <th class={css["th"]!}>Name</th>
                  <th class={`${css["th"]!} ${css["right"]!}`}>Price</th>
                  <th class={`${css["th"]!} ${css["right"]!}`}>1h %</th>
                  <th class={`${css["th"]!} ${css["right"]!}`}>24h %</th>
                  <th class={`${css["th"]!} ${css["right"]!}`}>7d %</th>
                  <th class={`${css["th"]!} ${css["right"]!}`}>Market Cap</th>
                  <th class={`${css["th"]!} ${css["right"]!}`}>Volume (24h)</th>
                  <th class={`${css["th"]!} ${css["right"]!}`}>Vol/MCap</th>
                  <th class={`${css["th"]!} ${css["right"]!}`}>Circ. Supply</th>
                  <th class={`${css["th"]!} ${css["right"]!}`}>% from ATH</th>
                  <th class={`${css["th"]!} ${css["right"]!}`}>Last 7 Days</th>
                </tr>
              </thead>
              <tbody>
                {coins.map((coin) => {
                  const priceDisplay = derived(coin.price, fmt);
                  const change1hDisplay = derived(coin.change1h, fmtChange);
                  const change24hDisplay = derived(coin.change24h, fmtChange);
                  const change7dDisplay = derived(coin.change7d, fmtChange);
                  const mcapDisplay = derived(coin.price, (p) =>
                    fmtCompact(p * coin.supply),
                  );
                  const volumeDisplay = derived(coin.volume, fmtCompact);
                  const volMcapDisplay = derived(coin.volume, (vol) => {
                    const mcap = coin.price.get() * coin.supply;
                    return `${((vol / mcap) * 100).toFixed(2)}%`;
                  });
                  const supplyDisplay = fmtSupply(
                    coin.supply,
                    coin.meta.symbol,
                  );
                  const pctATHDisplay = derived(coin.price, (p) =>
                    fmtPctFromATH(p, coin.ath),
                  );
                  const strokeColor = pulse(
                    coin.change7d.get() >= 0
                      ? "var(--beat-ui-color-success)"
                      : "var(--beat-ui-color-danger)",
                  );
                  onCleanup(
                    coin.change7d.on(({ currentValue }) => {
                      strokeColor.set(
                        currentValue >= 0
                          ? "var(--beat-ui-color-success)"
                          : "var(--beat-ui-color-danger)",
                      );
                    }),
                  );

                  return (
                    <tr class={css["tr"]!}>
                      <td class={css["td"]!}>
                        <span class={css["rank"]!}>{coin.meta.rank}</span>
                      </td>
                      <td class={css["td"]!}>
                        <div class={css["coinName"]!}>
                          <div class={css["coinInitial"]!}>
                            {coin.meta.symbol[0]}
                          </div>
                          <div>
                            <div class={css["coinTitle"]!}>
                              {coin.meta.name}
                            </div>
                            <div class={css["coinSymbol"]!}>
                              {coin.meta.symbol}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td
                        class={`${css["td"]!} ${css["right"]!}`}
                        ref={(el) => {
                          const td = el as HTMLTableCellElement;
                          onCleanup(
                            coin.flashClass.on(({ currentValue }) => {
                              td.className = `${css["td"]!} ${css["right"]!}${currentValue ? ` ${currentValue}` : ""}`;
                            }),
                          );
                        }}
                      >
                        <span class={css["price"]!} text={priceDisplay} />
                      </td>
                      <td class={`${css["td"]!} ${css["right"]!}`}>
                        <Badge tone={tone(coin.change1h.get())} size="sm">
                          <span text={change1hDisplay} />
                        </Badge>
                      </td>
                      <td class={`${css["td"]!} ${css["right"]!}`}>
                        <Badge tone={tone(coin.change24h.get())} size="sm">
                          <span text={change24hDisplay} />
                        </Badge>
                      </td>
                      <td class={`${css["td"]!} ${css["right"]!}`}>
                        <Badge tone={tone(coin.change7d.get())} size="sm">
                          <span text={change7dDisplay} />
                        </Badge>
                      </td>
                      <td class={`${css["td"]!} ${css["right"]!}`}>
                        <span class={css["price"]!} text={mcapDisplay} />
                      </td>
                      <td class={`${css["td"]!} ${css["right"]!}`}>
                        <span class={css["muted"]!} text={volumeDisplay} />
                      </td>
                      <td class={`${css["td"]!} ${css["right"]!}`}>
                        <span class={css["muted"]!} text={volMcapDisplay} />
                      </td>
                      <td class={`${css["td"]!} ${css["right"]!}`}>
                        <span class={css["muted"]!}>{supplyDisplay}</span>
                      </td>
                      <td class={`${css["td"]!} ${css["right"]!}`}>
                        <Badge tone="danger" size="sm">
                          <span text={pctATHDisplay} />
                        </Badge>
                      </td>
                      <td class={`${css["td"]!} ${css["right"]!}`}>
                        <Sparkline
                          values={coin.history}
                          width={100}
                          height={32}
                          stroke={strokeColor}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  },
);
