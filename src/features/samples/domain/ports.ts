import type { CoinMeta, TaskBoardData } from "./types";

export interface TaskBoardPort {
  getTaskBoardData(): Promise<TaskBoardData>;
}

export interface CryptoDashboardPort {
  getCoins(): Promise<readonly CoinMeta[]>;
}
