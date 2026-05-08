export interface HttpClient {
  get<T>(endpoint: string): Promise<T>;
}

/**
 * Mock HTTP client that simulates network latency.
 * In production this would be replaced with a real fetch-based implementation.
 */
export class MockHttpClient implements HttpClient {
  private readonly latencyMs: number;

  constructor(latencyMs = 200) {
    this.latencyMs = latencyMs;
  }

  async get<T>(endpoint: string): Promise<T> {
    const handler = this.routes.get(endpoint);
    if (handler === undefined) {
      await this.delay();
      return Promise.reject(new Error(`404 Not Found: ${endpoint}`));
    }
    await this.delay();
    return handler() as T;
  }

  private readonly routes = new Map<string, () => unknown>();

  register<T>(endpoint: string, data: () => T): this {
    this.routes.set(endpoint, data);
    return this;
  }

  private delay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, this.latencyMs));
  }
}
