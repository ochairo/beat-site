import type { CoinMeta, SyncSheetSnapshot, TaskBoardData } from "./types";

export interface TaskBoardPort {
  getTaskBoardData(): Promise<TaskBoardData>;
}

export interface CryptoDashboardPort {
  getCoins(): Promise<readonly CoinMeta[]>;
}

export interface SyncSheetPort {
  getSyncSheetSnapshot(): Promise<SyncSheetSnapshot>;
}
