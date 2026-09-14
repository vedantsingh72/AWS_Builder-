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

export type AgentRole = string;

export type OrgSuggestion = {
  role: string;
  recommendedOn: boolean;
  reason: string;
  score?: number;
};

export type OrgSelectResult = {
  startupId: string;
  roles: string[];
};

export function getOrgSuggestion(startupId: string) {
  return request<{ startupId: string; suggestions: OrgSuggestion[] }>(
    `/org/suggest?startupId=${encodeURIComponent(startupId)}`,
    { method: "GET" },
  );
}

export function selectOrg(startupId: string, roles: string[]) {
  return request<OrgSelectResult>("/org/select", {
    method: "POST",
    body: JSON.stringify({ startupId, roles }),
  });
}

// Local shape mirroring the T7 row — no shared-types runtime import in the
// browser (see OrgSuggestion.tsx note).
export type PrivateContext = {
  id: string;
  startupId: string;
  agentId: string;
  resourceLabel: string;
  resourceValue: string;
};

export function getCEOAgentId(startupId: string) {
  return request<{ startupId: string; agentId: string }>(
    `/private-context/ceo?startupId=${encodeURIComponent(startupId)}`,
    { method: "GET" },
  );
}

export function getPrivateContext(startupId: string, agentId: string) {
  const q = `startupId=${encodeURIComponent(startupId)}&agentId=${encodeURIComponent(agentId)}`;
  return request<PrivateContext>(`/private-context?${q}`, { method: "GET" });
}

export function savePrivateContext(input: {
  startupId: string;
  agentId: string;
  resourceLabel: string;
  resourceValue: string;
}) {
  return request<PrivateContext>("/private-context", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}