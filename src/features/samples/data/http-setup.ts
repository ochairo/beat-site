import type { MockHttpClient } from "../../../shared/lib/http/http-client";
import { TASK_BOARD_DATA } from "./task/data";
import { COIN_META } from "./crypto/data";

export function registerSamplesEndpoints(client: MockHttpClient): void {
  client.register("/api/samples/task-board", () => TASK_BOARD_DATA);
  client.register("/api/samples/crypto-dashboard", () => COIN_META);
}
