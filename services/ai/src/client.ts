// THE only path that writes to api's DB — over HTTP, never direct Postgres.
// Domain methods (tasks, decisions, executions) land here in later tasks;
// T1 needs no writes, so this ships as the typed transport primitive.
import { config } from "./config.js";

export class ApiClient {
  constructor(readonly baseUrl: string = config.apiBaseUrl) {}

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`);
    if (!res.ok) throw new Error(`api GET ${path} failed: ${res.status}`);
    return (await res.json()) as T;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`api POST ${path} failed: ${res.status}`);
    return (await res.json()) as T;
  }
}

export const apiClient = new ApiClient();
