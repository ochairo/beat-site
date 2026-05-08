import { component, onCleanup, type BeatJsxChild } from "@ochairo/beat";
import { Badge, Card, Sparkline } from "@ochairo/beat-ui";
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

// ── Reactive coin state ──

interface CoinState {
  meta: CoinMeta;
  price: ReturnType<typeof pulse<number>>;
  history: ReturnType<typeof pulse<readonly number[]>>;
  change1h: ReturnType<typeof pulse<number>>;
  change24h: ReturnType<typeof pulse<number>>;
  change7d: ReturnType<typeof pulse<number>>;
}

function makeCoinState(meta: CoinMeta): CoinState {
  const initialHistory = Array.from({ length: 20 }, (_, i) =>
    jitter(meta.basePrice, 0.04 * ((20 - i) / 20)),
  );
  return {
    meta,
    price: pulse(meta.basePrice),
    history: pulse<readonly number[]>(initialHistory),
    change1h: pulse((Math.random() - 0.5) * 0.006),
    change24h: pulse((Math.random() - 0.5) * 0.04),
    change7d: pulse((Math.random() - 0.5) * 0.1),
  };
}

// ── Component ──

export interface CryptoDashboardProps {
  readonly coins: readonly CoinMeta[];
}

export const CryptoDashboard = component<CryptoDashboardProps>(
  (props): BeatJsxChild => {
    const coins = props.coins.map(makeCoinState);

    const marketCap = pulse(2.66e12);
    const volume24h = pulse(133.7e9);
    const fearGreed = pulse(47);
    const btcDominance = pulse(60.2);

    const interval = setInterval(() => {
      for (const coin of coins) {
        const next = jitter(coin.price.get(), 0.004);
        coin.price.set(next);
        coin.history.set([...coin.history.get().slice(1), next]);
        coin.change1h.set(coin.change1h.get() + (Math.random() - 0.5) * 0.0004);
        coin.change24h.set(
          coin.change24h.get() + (Math.random() - 0.5) * 0.001,
        );
        coin.change7d.set(coin.change7d.get() + (Math.random() - 0.5) * 0.0005);
      }
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
    }, 500);

    onCleanup(() => clearInterval(interval));

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

    return (
      <div class={css["root"]!}>
        <div class={css["statGrid"]!}>
          <Card padding="md" radius="md">
            <div class={css["statLabel"]!}>Global Market Cap</div>
            <div class={css["statValue"]!} text={marketCapDisplay} />
          </Card>
          <Card padding="md" radius="md">
            <div class={css["statLabel"]!}>24h Volume</div>
            <div class={css["statValue"]!} text={volumeDisplay} />
          </Card>
          <Card padding="md" radius="md">
            <div class={css["statLabel"]!}>Fear &amp; Greed</div>
            <div class={css["statValue"]!} text={fearGreedDisplay} />
            <span class={css["statSub"]!}>Neutral</span>
          </Card>
          <Card padding="md" radius="md">
            <div class={css["statLabel"]!}>BTC Dominance</div>
            <div class={css["statValue"]!} text={btcDomDisplay} />
          </Card>
          <Card padding="md" radius="md">
            <div class={css["statLabel"]!}>Active Cryptos</div>
            <div class={css["statValue"]!}>50.24M</div>
            <span class={css["statSub"]!}>Networks</span>
          </Card>
        </div>

        <Card padding="none" radius="lg" style="overflow:hidden">
          <div class={css["tableWrapper"]!}>
            <table class={css["table"]!}>
              <colgroup>
                <col style="width:48px" />
                <col style="width:220px" />
                <col style="width:120px" />
                <col style="width:90px" />
                <col style="width:90px" />
                <col style="width:90px" />
                <col style="width:120px" />
              </colgroup>
              <thead>
                <tr>
                  <th class={css["th"]!}>#</th>
                  <th class={css["th"]!}>Name</th>
                  <th class={`${css["th"]!} ${css["right"]!}`}>Price</th>
                  <th class={`${css["th"]!} ${css["right"]!}`}>1h %</th>
                  <th class={`${css["th"]!} ${css["right"]!}`}>24h %</th>
                  <th class={`${css["th"]!} ${css["right"]!}`}>7d %</th>
                  <th class={`${css["th"]!} ${css["right"]!}`}>Last 7 Days</th>
                </tr>
              </thead>
              <tbody>
                {coins.map((coin) => {
                  const priceDisplay = derived(coin.price, fmt);
                  const change1hDisplay = derived(coin.change1h, fmtChange);
                  const change24hDisplay = derived(coin.change24h, fmtChange);
                  const change7dDisplay = derived(coin.change7d, fmtChange);
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
                      <td class={`${css["td"]!} ${css["right"]!}`}>
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

        <p class={css["disclaimer"]!}>
          Simulated data updates each 500ms — not real market prices.
        </p>
      </div>
    );
  },
);
