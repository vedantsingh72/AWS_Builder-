const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export type StructuredFields = {
  industry: string;
  goal: string;
  stage: string;
  constraints: string[];
  priorities: string[];
};

export type Startup = StructuredFields & {
  id: string;
  rawDescription: string;
  status: "DRAFT" | "APPROVED";
  threadId: string | null;
  createdAt: string;
  updatedAt: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body);
  }

  return res.json();
}

export class ApiError extends Error {
  status: number;
  fields?: { path: string; message: string }[];

  constructor(status: number, body: { error?: string; fields?: { path: string; message: string }[] }) {
    super(body.error ?? `Request failed with ${status}`);
    this.status = status;
    this.fields = body.fields;
  }
}

export function createStartup(input: { rawDescription: string } & Partial<StructuredFields>) {
  return request<Startup>("/startup", { method: "POST", body: JSON.stringify(input) });
}

export function getStartup(id: string) {
  return request<Startup>(`/startup/${id}`, { method: "GET" });
}

export function approveStartup(id: string, input: { rawDescription: string } & StructuredFields) {
  return request<Startup>(`/startup/${id}`, { method: "PUT", body: JSON.stringify(input) });
}