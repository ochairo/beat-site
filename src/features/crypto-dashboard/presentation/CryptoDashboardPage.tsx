import { Show, component, onMount, type BeatJsxChild } from "@ochairo/beat";
import { pulse } from "@ochairo/pulse";

import type { CryptoDashboardPort } from "../domain/ports";
import type { CoinMeta } from "../domain/types";
import { CryptoDashboard } from "./components/crypto-dashboard/CryptoDashboard";

export interface CryptoDashboardPageProps {
  readonly cryptoDashboardPort: CryptoDashboardPort;
}

export const CryptoDashboardPage = component<CryptoDashboardPageProps>(
  (props): BeatJsxChild => {
    const coins = pulse<readonly CoinMeta[] | null>(null);

    onMount(() => {
      void props.cryptoDashboardPort.getCoins().then((data) => coins.set(data));
    });

    return (
      <Show when={coins} mapValue={(value) => value !== null}>
        {() => <CryptoDashboard coins={coins.get()!} />}
      </Show>
    );
  },
);
